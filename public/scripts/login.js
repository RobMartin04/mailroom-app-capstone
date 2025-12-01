// Login functionality
document.addEventListener("DOMContentLoaded", () => {
	const token = localStorage.getItem("authToken")
	const userType = localStorage.getItem("userType")
	if (token && userType) {
		redirectToDashboard(userType)
		return
	}

	// Tabs: use data attributes + listeners, no globals
	const tabButtons = document.querySelectorAll(".tab-btn")
	const tabsContainer = document.querySelector(".tabs")

	const setActiveTab = (tabName) => {
		document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
		document.querySelectorAll(".login-form").forEach((form) => form.classList.remove("active"))
		const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`)

		let formId
		if (tabName === "student") formId = "studentLoginForm"
		else if (tabName === "worker") formId = "workerLoginForm"

		if (btn) btn.classList.add("active")
		document.getElementById(formId)?.classList.add("active")
		document.getElementById("errorMessage").innerHTML = ""

		// Show tabs container when on login forms
		if (tabsContainer) tabsContainer.style.display = "flex"
	}

	tabButtons.forEach((btn) => {
		btn.addEventListener("click", () => setActiveTab(btn.dataset.tab))
	})

	// Show registration form
	const showRegisterForm = (userType) => {
		document.querySelectorAll(".login-form").forEach((form) => form.classList.remove("active"))
		document.getElementById("registerForm")?.classList.add("active")
		document.getElementById("errorMessage").innerHTML = ""

		// Hide tabs when showing registration
		if (tabsContainer) tabsContainer.style.display = "none"

		// Pre-select user type if provided
		if (userType) {
			const userTypeSelect = document.getElementById("registerUserType")
			if (userTypeSelect) {
				userTypeSelect.value = userType
				// Trigger change event to show/hide L number field
				userTypeSelect.dispatchEvent(new Event("change"))
			}
		}
	}

	// "Create Account" link handlers
	const showRegisterFromStudent = document.getElementById("showRegisterFromStudent")
	const showRegisterFromWorker = document.getElementById("showRegisterFromWorker")
	const backToLogin = document.getElementById("backToLogin")

	if (showRegisterFromStudent) {
		showRegisterFromStudent.addEventListener("click", (e) => {
			e.preventDefault()
			showRegisterForm("student")
		})
	}

	if (showRegisterFromWorker) {
		showRegisterFromWorker.addEventListener("click", (e) => {
			e.preventDefault()
			showRegisterForm("worker")
		})
	}

	if (backToLogin) {
		backToLogin.addEventListener("click", (e) => {
			e.preventDefault()
			setActiveTab("student") // Default to student login
		})
	}

	// Consolidated form handling for student and worker
	const loginConfig = {
		student: {
			form: "#studentLoginForm",
			emailField: "#studentEmail",
			passField: "#studentPassword",
		},
		worker: {
			form: "#workerLoginForm",
			emailField: "#workerEmail",
			passField: "#workerPassword",
		},
	}

	// Login form handlers (with real authentication)
	Object.entries(loginConfig).forEach(([type, cfg]) => {
		const form = document.querySelector(cfg.form)
		if (!form) return
		form.addEventListener("submit", async (e) => {
			e.preventDefault()
			const email = document.querySelector(cfg.emailField)?.value?.trim() || ""
			const password = document.querySelector(cfg.passField)?.value || ""

			if (!email || !password) {
				showError("Please enter email and password")
				return
			}

			try {
				const response = await window.apiClient.login(email, password, type)

				// Store user info
				localStorage.setItem("userType", type)
				localStorage.setItem("currentUser", JSON.stringify(response.user))

				redirectToDashboard(type)
			} catch (error) {
				showError(error.message || "Login failed. Please check your credentials.")
			}
		})
	})

	function redirectToDashboard(userType) {
		window.location.href = userType === "worker" ? "worker-dashboard.html" : "student-dashboard.html"
	}

	function showError(message) {
		const el = document.getElementById("errorMessage")
		if (!el) return
		el.innerHTML = `
			<div class="alert alert-danger alert-dismissible fade show" role="alert">
				${message}
				<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
			</div>
		`
		setTimeout(() => (el.innerHTML = ""), 5000)
	}

	function showSuccess(message) {
		const el = document.getElementById("errorMessage")
		if (!el) return
		el.innerHTML = `
			<div class="alert alert-success alert-dismissible fade show" role="alert">
				${message}
				<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
			</div>
		`
		setTimeout(() => (el.innerHTML = ""), 5000)
	}

	// Show/hide L number field based on user type selection
	const userTypeSelect = document.getElementById("registerUserType")
	const lNumberField = document.getElementById("lNumberField")
	const lNumberInput = document.getElementById("registerLNumber")

	if (userTypeSelect && lNumberField && lNumberInput) {
		userTypeSelect.addEventListener("change", (e) => {
			if (e.target.value === "student") {
				lNumberField.style.display = "block"
				lNumberInput.required = true
			} else {
				lNumberField.style.display = "none"
				lNumberInput.required = false
				lNumberInput.value = ""
			}
		})
	}

	// Registration form handler
	const registerForm = document.getElementById("registerForm")
	if (registerForm) {
		registerForm.addEventListener("submit", async (e) => {
			e.preventDefault()

			const userType = document.getElementById("registerUserType")?.value || ""
			const email = document.getElementById("registerEmail")?.value?.trim() || ""
			const fullName = document.getElementById("registerFullName")?.value?.trim() || ""
			const lNumber = document.getElementById("registerLNumber")?.value?.trim() || ""
			const password = document.getElementById("registerPassword")?.value || ""
			const confirmPassword = document.getElementById("registerConfirmPassword")?.value || ""

			// Validation
			if (!userType || !email || !fullName || !password || !confirmPassword) {
				showError("Please fill in all required fields")
				return
			}

			if (userType === "student" && !lNumber) {
				showError("L number is required for students")
				return
			}

			if (password !== confirmPassword) {
				showError("Passwords do not match")
				return
			}

			if (password.length < 6) {
				showError("Password must be at least 6 characters long")
				return
			}

			// Validate L number format if student
			if (userType === "student" && lNumber && !/^L\d{8}$/.test(lNumber)) {
				showError("L number must start with 'L' followed by 8 digits (e.g., L00123456)")
				return
			}

			try {
				const response = await window.apiClient.register(
					password,
					userType,
					email,
					fullName,
					lNumber || null
				)

				// Store user info
				localStorage.setItem("userType", userType)
				localStorage.setItem("currentUser", JSON.stringify(response.user))

				// Show success message
				showSuccess("Registration successful! Redirecting...")

				// Redirect to appropriate dashboard after a short delay
				setTimeout(() => {
					redirectToDashboard(userType)
				}, 1500)
			} catch (error) {
				showError(error.message || "Registration failed. Please try again.")
			}
		})
	}
})
