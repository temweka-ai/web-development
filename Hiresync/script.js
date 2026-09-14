/* HireSync JavaScript */

// Demo applications
const defaultApplications = [
    {
        id: 1,
        company: "Motus Corporation",
        role: "Apprentice Level 1",
        location: "Sandton, Gauteng",
        status: "Applied",
        applicationDate: ""
    },
    {
        id: 2,
        company: "Takealot",
        role: "Junior Developer",
        location: "Cape Town / Remote",
        status: "Interview",
        applicationDate: ""
    },
    {
        id: 3,
        company: "TymeBank",
        role: "Software Developer",
        location: "Johannesburg",
        status: "Offer",
        applicationDate: ""
    }
];

// Load saved applications or use demo data
const savedApplications = localStorage.getItem("hiresyncApplications");

let applications = savedApplications
    ? JSON.parse(savedApplications)
    : defaultApplications;

// Tracks the application currently being edited
let editingApplicationId = null;

// Save applications to Local Storage
function saveApplications() {
    localStorage.setItem(
        "hiresyncApplications",
        JSON.stringify(applications)
    );
}

// Dashboard elements
const totalApplications =
    document.querySelector("#total-applications");

const totalAssessments =
    document.querySelector("#total-assessments");

const totalInterviews =
    document.querySelector("#total-interviews");

const totalOffers =
    document.querySelector("#total-offers");

const responseRate =
    document.querySelector("#response-rate");

const searchApplications =
    document.querySelector("#search-applications");

const statusFilter =
    document.querySelector("#status-filter");

// Search and filter
searchApplications.addEventListener("input", () => {
    renderApplications();
});

statusFilter.addEventListener("change", () => {
    renderApplications();
});

// Update dashboard statistics
function updateStatistics() {
    const assessments = applications.filter(
        application => application.status === "Assessment"
    );

    totalAssessments.textContent = assessments.length;

    totalApplications.textContent = applications.length;

    const interviews = applications.filter(
        application => application.status === "Interview"
    );

    totalInterviews.textContent = interviews.length;

    const offers = applications.filter(
        application => application.status === "Offer"
    );

    totalOffers.textContent = offers.length;

    const responses = applications.filter(
        application => application.status !== "Applied"
    );

    if (applications.length > 0) {
        const rate = Math.round(
            (responses.length / applications.length) * 100
        );

        responseRate.textContent = `${rate}%`;
    } else {
        responseRate.textContent = "0%";
    }
}

// Kanban columns
const kanbanColumns =
    document.querySelectorAll(".kanban-column");

// Render application cards
function renderApplications() {
    document.querySelectorAll(".application-list").forEach(list => {
        list.innerHTML = "";
    });

    const searchTerm =
        searchApplications.value.toLowerCase().trim();

    const selectedStatus =
        statusFilter.value;

    const filteredApplications =
        applications.filter(application => {
            const matchesSearch =
                application.company
                    .toLowerCase()
                    .includes(searchTerm) ||

                application.role
                    .toLowerCase()
                    .includes(searchTerm) ||

                (application.location || "")
                    .toLowerCase()
                    .includes(searchTerm);

            const matchesStatus =
                selectedStatus === "All" ||
                application.status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

    filteredApplications.forEach(application => {
        const card = document.createElement("div");

        card.className = "application-card";
        card.draggable = true;
        card.dataset.id = application.id;

        const statusClass = application.status
            .toLowerCase()
            .replace(/\s+/g, "-");

        card.innerHTML = `
            <div class="application-card-header">
                <h3>${application.company}</h3>

                <span class="application-status status-${statusClass}">
                    ${application.status}
                </span>
            </div>

            <p class="application-role">
                ${application.role}
            </p>

            ${
                application.location
                    ? `
                        <p class="application-location">
                            📍 ${application.location}
                        </p>
                    `
                    : ""
            }

            ${
                application.applicationDate
                    ? `
                        <p class="application-date">
                            📅 ${application.applicationDate}
                        </p>
                    `
                    : ""
            }

            ${
                application.salary
                    ? `
                        <p class="application-salary">
                            💰 ${application.salary}
                        </p>
                    `
                    : ""
            }

            ${
                application.closingDate
                    ? `
                        <p class="application-closing-date">
                            ⏳ Closes: ${application.closingDate}
                        </p>
                    `
                    : ""
            }

            ${
                application.jobUrl
                    ? `
                        <p class="application-url">
                            🔗
                            <a
                                href="${application.jobUrl}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                View Job Posting
                            </a>
                        </p>
                    `
                    : ""
            }

            ${
                application.notes
                    ? `
                        <p class="application-notes">
                            📝 ${application.notes}
                        </p>
                    `
                    : ""
            }

            <div class="application-actions">
                <button
                    class="edit-btn"
                    data-id="${application.id}"
                >
                    Edit
                </button>

                <button
                    class="delete-btn"
                    data-id="${application.id}"
                >
                    Delete
                </button>
            </div>
        `;

        // Drag start
        card.addEventListener("dragstart", event => {
            card.classList.add("dragging");

            event.dataTransfer.setData(
                "text/plain",
                application.id
            );

            event.dataTransfer.effectAllowed = "move";
        });

        // Drag end
        card.addEventListener("dragend", () => {
            card.classList.remove("dragging");
        });

        const targetColumn =
            [...kanbanColumns].find(column => {
                return (
                    column
                        .querySelector(".column-header span")
                        .textContent
                        .trim() === application.status
                );
            });

        targetColumn
            .querySelector(".application-list")
            .appendChild(card);
    });

    updateColumnCounts();
}

// Update Kanban column counters
function updateColumnCounts() {
    kanbanColumns.forEach(column => {
        const columnTitle =
            column.querySelector(".column-header span");

        const count =
            column.querySelector(".column-count");

        if (!columnTitle || !count) return;

        const status =
            columnTitle.textContent.trim();

        const number =
            applications.filter(
                application =>
                    application.status === status
            ).length;

        count.textContent = number;
    });
}

// Drag and drop
document
    .querySelectorAll(".application-list")
    .forEach(list => {
        list.addEventListener("dragover", event => {
            event.preventDefault();
        });

        list.addEventListener("drop", event => {
            event.preventDefault();

            const id = Number(
                event.dataTransfer.getData("text/plain")
            );

            const application =
                applications.find(app => app.id === id);

            if (!application) return;

            const newStatus = list
                .closest(".kanban-column")
                .querySelector(".column-header span")
                .textContent
                .trim();

            application.status = newStatus;

            saveApplications();
            updateStatistics();
            renderApplications();
        });
    });

// Initial dashboard load
updateStatistics();
renderApplications();
updateColumnCounts();

// Application modal
const modal =
    document.querySelector("#application-modal");

const openModalButton =
    document.querySelector("#open-modal");

const closeModalButton =
    document.querySelector("#close-modal");

const cancelModalButton =
    document.querySelector("#cancel-modal");

// Open modal
openModalButton.addEventListener("click", () => {
    applicationForm.reset();

    editingApplicationId = null;

    document.querySelector(
        ".modal-header h2"
    ).textContent = "Add Job Application";

    document.querySelector(
        "#submit-application"
    ).textContent = "Add Application";

    modal.classList.add("active");
});

// Close modal
closeModalButton.addEventListener("click", () => {
    modal.classList.remove("active");
});

// Cancel form
cancelModalButton.addEventListener("click", () => {
    modal.classList.remove("active");
});

// Close modal when clicking outside
modal.addEventListener("click", event => {
    if (event.target === modal) {
        modal.classList.remove("active");
    }
});

// Application form
const applicationForm =
    document.querySelector("#application-form");

applicationForm.addEventListener("submit", event => {
    event.preventDefault();

    // Get form values
    const company =
        document.querySelector("#company").value.trim();

    const role =
        document.querySelector("#role").value.trim();

    const location =
        document.querySelector("#location").value.trim();

    const status =
        document.querySelector("#status").value;

    const applicationDate =
        document.querySelector("#application-date").value;

    const salary =
        document.querySelector("#salary").value.trim();

    const closingDate =
        document.querySelector("#closing-date").value;

    const jobUrl =
        document.querySelector("#job-url").value.trim();

    const notes =
        document.querySelector("#notes").value.trim();

    // Edit existing application
    if (editingApplicationId !== null) {
        const application =
            applications.find(
                application =>
                    application.id === editingApplicationId
            );

        if (application) {
            application.company = company;
            application.role = role;
            application.location = location;
            application.status = status;
            application.applicationDate = applicationDate;
            application.salary = salary;
            application.closingDate = closingDate;
            application.jobUrl = jobUrl;
            application.notes = notes;
        }

        saveApplications();

    } else {
        // Create new application
        const newApplication = {
            id: Date.now(),
            company: company,
            role: role,
            location: location,
            status: status,
            applicationDate: applicationDate,
            salary: salary,
            closingDate: closingDate,
            jobUrl: jobUrl,
            notes: notes
        };

        applications.push(newApplication);

        saveApplications();
    }

    // Refresh dashboard
    saveApplications();
    updateStatistics();
    renderApplications();
    updateColumnCounts();

    // Reset form
    applicationForm.reset();

    editingApplicationId = null;

    // Restore Add mode
    document.querySelector(
        ".modal-header h2"
    ).textContent = "Add Job Application";

    document.querySelector(
        "#submit-application"
    ).textContent = "Add Application";

    modal.classList.remove("active");
});

// Delete application
document.addEventListener("click", event => {
    if (event.target.classList.contains("delete-btn")) {
        const applicationId =
            Number(event.target.dataset.id);

        const confirmDelete = confirm(
            "Are you sure you want to delete this application?"
        );

        if (!confirmDelete) {
            return;
        }

        applications = applications.filter(
            application =>
                application.id !== applicationId
        );

        saveApplications();

        updateStatistics();
        renderApplications();
        updateColumnCounts();
    }
});

// Edit application
document.addEventListener("click", event => {
    if (event.target.classList.contains("edit-btn")) {
        const applicationId =
            Number(event.target.dataset.id);

        const application =
            applications.find(
                application =>
                    application.id === applicationId
            );

        if (!application) {
            return;
        }

        editingApplicationId = applicationId;

        // Fill the form
        document.querySelector("#company").value =
            application.company;

        document.querySelector("#role").value =
            application.role;

        document.querySelector("#location").value =
            application.location || "";

        document.querySelector("#status").value =
            application.status;

        document.querySelector("#application-date").value =
            application.applicationDate || "";

        document.querySelector("#salary").value =
            application.salary || "";

        document.querySelector("#closing-date").value =
            application.closingDate || "";

        document.querySelector("#job-url").value =
            application.jobUrl || "";

        document.querySelector("#notes").value =
            application.notes || "";
            

        // Update modal
        document.querySelector(
            ".modal-header h2"
        ).textContent = "Edit Job Application";

        document.querySelector(
            "#submit-application"
        ).textContent = "Save Changes";

        modal.classList.add("active");
    }
});