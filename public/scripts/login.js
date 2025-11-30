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
	}
	tabButtons.forEach((btn) => {
		btn.addEventListener("click", () => setActiveTab(btn.dataset.tab))
	})

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
})
