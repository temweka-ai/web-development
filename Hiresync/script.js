/* =========================================================
   HIRESYNC JAVASCRIPT
   ========================================================= */

/* =========================================================
   DEMO APPLICATIONS
   ========================================================= */
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

/* =========================================================
   LOAD SAVED APPLICATIONS
   ========================================================= */
const savedApplications =
    localStorage.getItem("hiresyncApplications");

let applications = savedApplications
    ? JSON.parse(savedApplications)
    : defaultApplications;

/* =========================================================
   EDITING STATE
   ========================================================= */
let editingApplicationId = null;

/* =========================================================
   SAVE APPLICATIONS
   ========================================================= */
function saveApplications() {
    localStorage.setItem(
        "hiresyncApplications",
        JSON.stringify(applications)
    );
}

/* =========================================================
   DASHBOARD ELEMENTS
   ========================================================= */
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

/* =========================================================
   SEARCH AND FILTER
   ========================================================= */
if (searchApplications && statusFilter) {
    searchApplications.addEventListener(
        "input",
        () => {
            renderApplications();
        }
    );

    statusFilter.addEventListener(
        "change",
        () => {
            renderApplications();
        }
    );
}

/* =========================================================
   UPDATE DASHBOARD STATISTICS
   ========================================================= */
function updateStatistics() {
    const assessments =
        applications.filter(
            application =>
                application.status === "Assessment"
        );

    totalAssessments.textContent =
        assessments.length;

    totalApplications.textContent =
        applications.length;

    const interviews =
        applications.filter(
            application =>
                application.status === "Interview"
        );

    totalInterviews.textContent =
        interviews.length;

    const offers =
        applications.filter(
            application =>
                application.status === "Offer"
        );

    totalOffers.textContent =
        offers.length;

    const responses =
        applications.filter(
            application =>
                application.status !== "Applied"
        );

    if (applications.length > 0) {
        const rate =
            Math.round(
                (responses.length / applications.length) * 100
            );

        responseRate.textContent =
            `${rate}%`;
    } else {
        responseRate.textContent =
            "0%";
    }
}

/* =========================================================
   KANBAN COLUMNS
   ========================================================= */
const kanbanColumns =
    document.querySelectorAll(".kanban-column");

/* =========================================================
   APPLICATIONS PAGE
   ========================================================= */
const applicationsPageList =
    document.querySelector("#applicationsList");

const applicationsPageSearch =
    document.querySelector("#applicationSearch");

const applicationsPageFilter =
    document.querySelector("#applicationFilter");

const applicationsPageSort =
    document.querySelector("#applicationSort");

/* =========================================================
   APPLICATION SUMMARY
   ========================================================= */
function updateApplicationSummary() {
    const summaryTotal =
        document.querySelector("#summary-total");

    if (!summaryTotal) {
        return;
    }

    summaryTotal.textContent =
        applications.length;

    document.querySelector("#summary-applied").textContent =
        applications.filter(
            application =>
                application.status === "Applied"
        ).length;

    document.querySelector("#summary-assessment").textContent =
        applications.filter(
            application =>
                application.status === "Assessment"
        ).length;

    document.querySelector("#summary-interview").textContent =
        applications.filter(
            application =>
                application.status === "Interview"
        ).length;

    document.querySelector("#summary-offer").textContent =
        applications.filter(
            application =>
                application.status === "Offer"
        ).length;

    document.querySelector("#summary-rejected").textContent =
        applications.filter(
            application =>
                application.status === "Rejected"
        ).length;
}

/* =========================================================
   RENDER APPLICATIONS PAGE
   ========================================================= */
function renderApplicationsPage() {
    if (!applicationsPageList) {
        return;
    }

    updateApplicationSummary();

    const searchTerm =
        applicationsPageSearch
            ? applicationsPageSearch.value
                .toLowerCase()
                .trim()
            : "";

    const selectedStatus =
        applicationsPageFilter
            ? applicationsPageFilter.value
            : "all";

    const filteredApplications =
        applications.filter(
            application => {
                const matchesSearch =
                    application.company
                        .toLowerCase()
                        .includes(searchTerm)
                    ||
                    application.role
                        .toLowerCase()
                        .includes(searchTerm)
                    ||
                    (application.location || "")
                        .toLowerCase()
                        .includes(searchTerm);

                const matchesStatus =
                    selectedStatus === "all"
                    ||
                    application.status === selectedStatus;

                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );

    /* Sort applications */
    const sortedApplications =
        [...filteredApplications].sort(
            (a, b) => {
                switch (
                    applicationsPageSort
                        ? applicationsPageSort.value
                        : "newest"
                ) {
                    case "oldest":
                        return (
                            new Date(
                                a.applicationDate || "9999-12-31"
                            ) -
                            new Date(
                                b.applicationDate || "9999-12-31"
                            )
                        );

                    case "company":
                        return a.company.localeCompare(
                            b.company
                        );

                    case "closing":
                        return (
                            new Date(
                                a.closingDate || "9999-12-31"
                            ) -
                            new Date(
                                b.closingDate || "9999-12-31"
                            )
                        );

                    case "status":
                        return a.status.localeCompare(
                            b.status
                        );

                    case "newest":
                    default:
                        return (
                            new Date(
                                b.applicationDate || "0000-01-01"
                            ) -
                            new Date(
                                a.applicationDate || "0000-01-01"
                            )
                        );
                }
            }
        );

    applicationsPageList.innerHTML = "";

    sortedApplications.forEach(
        application => {
            const card =
                document.createElement("div");

            card.className =
                "application-card";

            const statusClass =
                application.status
                    .toLowerCase()
                    .replace(/\s+/g, "-");

            card.innerHTML = `
                <div class="application-card-header">
                    <h3>
                        ${application.company}
                    </h3>

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

            applicationsPageList.appendChild(card);
        }
    );
}

/* =========================================================
   APPLICATIONS PAGE CONTROLS
   ========================================================= */
if (
    applicationsPageSearch &&
    applicationsPageFilter
) {
    applicationsPageSearch.addEventListener(
        "input",
        renderApplicationsPage
    );

    applicationsPageFilter.addEventListener(
        "change",
        renderApplicationsPage
    );

    if (applicationsPageSort) {
        applicationsPageSort.addEventListener(
            "change",
            renderApplicationsPage
        );
    }
}

/* =========================================================
   RENDER APPLICATION CARDS
   ========================================================= */
function renderApplications() {
    document
        .querySelectorAll(".application-list")
        .forEach(
            list => {
                list.innerHTML = "";
            }
        );

    if (!searchApplications || !statusFilter) {
        return;
    }

    const searchTerm =
        searchApplications.value
            .toLowerCase()
            .trim();

    const selectedStatus =
        statusFilter.value;

    const filteredApplications =
        applications.filter(
            application => {
                const matchesSearch =
                    application.company
                        .toLowerCase()
                        .includes(searchTerm)
                    ||
                    application.role
                        .toLowerCase()
                        .includes(searchTerm)
                    ||
                    (application.location || "")
                        .toLowerCase()
                        .includes(searchTerm);

                const matchesStatus =
                    selectedStatus === "All"
                    ||
                    application.status === selectedStatus;

                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );

    filteredApplications.forEach(
        application => {
            const card =
                document.createElement("div");

            card.className =
                "application-card";

            card.draggable =
                true;

            card.dataset.id =
                application.id;

            const statusClass =
                application.status
                    .toLowerCase()
                    .replace(/\s+/g, "-");

            card.innerHTML = `
                <div class="application-card-header">
                    <h3>
                        ${application.company}
                    </h3>

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

            /* Drag start */
            card.addEventListener(
                "dragstart",
                event => {
                    card.classList.add("dragging");

                    event.dataTransfer.setData(
                        "text/plain",
                        application.id
                    );

                    event.dataTransfer.effectAllowed =
                        "move";
                }
            );

            /* Drag end */
            card.addEventListener(
                "dragend",
                () => {
                    card.classList.remove(
                        "dragging"
                    );
                }
            );

            const targetColumn =
                [...kanbanColumns].find(
                    column => {
                        const columnTitle =
                            column.querySelector(
                                ".column-header span"
                            );

                        return (
                            columnTitle &&
                            columnTitle.textContent
                                .trim() ===
                            application.status
                        );
                    }
                );

            if (targetColumn) {
                targetColumn
                    .querySelector(
                        ".application-list"
                    )
                    .appendChild(card);
            }
        }
    );

    updateColumnCounts();
}

/* =========================================================
   UPDATE KANBAN COUNTERS
   ========================================================= */
function updateColumnCounts() {
    kanbanColumns.forEach(
        column => {
            const columnTitle =
                column.querySelector(
                    ".column-header span"
                );

            const count =
                column.querySelector(
                    ".column-count"
                );

            if (!columnTitle || !count) {
                return;
            }

            const status =
                columnTitle.textContent.trim();

            const number =
                applications.filter(
                    application =>
                        application.status === status
                ).length;

            count.textContent =
                number;
        }
    );
}

/* =========================================================
   DRAG AND DROP
   ========================================================= */
document
    .querySelectorAll(".kanban-column")
    .forEach(
        column => {
            column.addEventListener(
                "dragover",
                event => {
                    event.preventDefault();

                    event.dataTransfer.dropEffect =
                        "move";
                }
            );

            column.addEventListener(
                "drop",
                event => {
                    event.preventDefault();

                    const id =
                        Number(
                            event.dataTransfer.getData(
                                "text/plain"
                            )
                        );

                    const application =
                        applications.find(
                            app =>
                                app.id === id
                        );

                    if (!application) {
                        return;
                    }

                    const columnTitle =
                        column.querySelector(
                            ".column-header span"
                        );

                    if (!columnTitle) {
                        return;
                    }

                    const newStatus =
                        columnTitle.textContent.trim();

                    application.status =
                        newStatus;

                    saveApplications();

                    renderApplications();

                    updateStatistics();

                    updateColumnCounts();

                    renderApplicationsPage();

                    updateAIInbox();
                }
            );
        }
    );

/* =========================================================
   AI INBOX
   ========================================================= */
function updateAIInbox() {
    const aiInbox =
        document.querySelector("#ai-inbox");

    if (!aiInbox) {
        return;
    }

    if (applications.length === 0) {
        aiInbox.innerHTML = `
            <p>No applications to analyse yet.</p>
        `;

        return;
    }

    const recommendations =
        applications.map(
            application => {
                let message = "";

                switch (application.status) {
                    case "Applied":
                        message =
                            "Consider following up if you have not received a response.";
                        break;

                    case "Assessment":
                        message =
                            "Assessment stage. Complete any required tests and prepare for the next step.";
                        break;

                    case "Interview":
                        message =
                            "Interview stage. Prepare questions, research the company, and review the role.";
                        break;

                    case "Offer":
                        message =
                            "Offer received. Review the salary, benefits, conditions, and next steps.";
                        break;

                    case "Rejected":
                        message =
                            "Application closed. Consider similar opportunities and continue applying.";
                        break;

                    default:
                        message =
                            "Review this application and update its status when needed.";
                }

                return `
                    <div class="ai-recommendation">
                        <strong>
                            ${application.company}
                        </strong>

                        <span>
                            ${application.status}
                        </span>

                        <p>
                            ${message}
                        </p>
                    </div>
                `;
            }
        );

    aiInbox.innerHTML =
        recommendations.join("");
}

/* =========================================================
   INITIAL PAGE LOAD
   ========================================================= */
if (
    document.querySelector(".kanban-column")
) {
    updateStatistics();
    renderApplications();
    updateColumnCounts();
}

renderApplicationsPage();
updateAIInbox();

/* =========================================================
   APPLICATION MODAL
   ========================================================= */
const modal =
    document.querySelector(
        "#application-modal"
    );

const openModalButton =
    document.querySelector(
        "#open-modal"
    );

const closeModalButton =
    document.querySelector(
        "#close-modal"
    );

const cancelModalButton =
    document.querySelector(
        "#cancel-modal"
    );

const applicationForm =
    document.querySelector(
        "#application-form"
    );

const hasApplicationModal =
    modal &&
    openModalButton &&
    closeModalButton &&
    cancelModalButton &&
    applicationForm;

/* =========================================================
   OPEN MODAL
   ========================================================= */
if (hasApplicationModal) {
    openModalButton.addEventListener(
        "click",
        () => {
            applicationForm.reset();

            editingApplicationId =
                null;

            document.querySelector(
                ".modal-header h2"
            ).textContent =
                "Add Job Application";

            document.querySelector(
                "#submit-application"
            ).textContent =
                "Add Application";

            modal.classList.add(
                "active"
            );
        }
    );
}

/* =========================================================
   CLOSE MODAL
   ========================================================= */
if (hasApplicationModal) {
    closeModalButton.addEventListener(
        "click",
        () => {
            modal.classList.remove(
                "active"
            );
        }
    );
}

/* =========================================================
   CANCEL FORM
   ========================================================= */
if (hasApplicationModal) {
    cancelModalButton.addEventListener(
        "click",
        () => {
            modal.classList.remove(
                "active"
            );
        }
    );
}

/* =========================================================
   CLOSE MODAL OUTSIDE
   ========================================================= */
if (hasApplicationModal) {
    modal.addEventListener(
        "click",
        event => {
            if (event.target === modal) {
                modal.classList.remove(
                    "active"
                );
            }
        }
    );
}

/* =========================================================
   APPLICATION FORM
   ========================================================= */
if (hasApplicationModal) {
    applicationForm.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            /* Get form values */
            const company =
                document.querySelector(
                    "#company"
                ).value.trim();

            const role =
                document.querySelector(
                    "#role"
                ).value.trim();

            const location =
                document.querySelector(
                    "#location"
                ).value.trim();

            const status =
                document.querySelector(
                    "#status"
                ).value;

            const applicationDate =
                document.querySelector(
                    "#application-date"
                ).value;

            const salary =
                document.querySelector(
                    "#salary"
                ).value.trim();

            const closingDate =
                document.querySelector(
                    "#closing-date"
                ).value;

            const jobUrl =
                document.querySelector(
                    "#job-url"
                ).value.trim();

            const notes =
                document.querySelector(
                    "#notes"
                ).value.trim();

            /* Edit existing application */
            if (
                editingApplicationId !== null
            ) {
                const application =
                    applications.find(
                        application =>
                            application.id ===
                            editingApplicationId
                    );

                if (application) {
                    application.company =
                        company;

                    application.role =
                        role;

                    application.location =
                        location;

                    application.status =
                        status;

                    application.applicationDate =
                        applicationDate;

                    application.salary =
                        salary;

                    application.closingDate =
                        closingDate;

                    application.jobUrl =
                        jobUrl;

                    application.notes =
                        notes;
                }
            } else {
                /* Create new application */
                const newApplication = {
                    id: Date.now(),
                    company: company,
                    role: role,
                    location: location,
                    status: status,
                    applicationDate:
                        applicationDate,
                    salary: salary,
                    closingDate:
                        closingDate,
                    jobUrl: jobUrl,
                    notes: notes
                };

                applications.push(
                    newApplication
                );
            }

            /* Save changes */
            saveApplications();

            /* Refresh dashboard */
            if (
                document.querySelector(
                    ".kanban-column"
                )
            ) {
                updateStatistics();
                renderApplications();
                updateColumnCounts();
            }

            /* Refresh applications page */
            renderApplicationsPage();

            updateAIInbox();

            /* Reset form */
            applicationForm.reset();

            editingApplicationId =
                null;

            /* Restore Add mode */
            document.querySelector(
                ".modal-header h2"
            ).textContent =
                "Add Job Application";

            document.querySelector(
                "#submit-application"
            ).textContent =
                "Add Application";

            modal.classList.remove(
                "active"
            );
        }
    );
}

/* =========================================================
   DELETE APPLICATION
   ========================================================= */
document.addEventListener(
    "click",
    event => {
        if (
            !event.target.classList.contains(
                "delete-btn"
            )
        ) {
            return;
        }

        const applicationId =
            Number(
                event.target.dataset.id
            );

        const confirmDelete =
            confirm(
                "Are you sure you want to delete this application?"
            );

        if (!confirmDelete) {
            return;
        }

        applications =
            applications.filter(
                application =>
                    application.id !==
                    applicationId
            );

        saveApplications();

        /* Dashboard refresh */
        if (
            document.querySelector(
                ".kanban-column"
            )
        ) {
            updateStatistics();
            renderApplications();
            updateColumnCounts();
        }

        /* Applications page refresh */
        renderApplicationsPage();

        updateAIInbox();
    }
);

/* =========================================================
   EDIT APPLICATION
   ========================================================= */
document.addEventListener(
    "click",
    event => {
        if (
            !event.target.classList.contains(
                "edit-btn"
            )
        ) {
            return;
        }

        const applicationId =
            Number(
                event.target.dataset.id
            );

        const application =
            applications.find(
                application =>
                    application.id ===
                    applicationId
            );

        if (!application) {
            return;
        }

        editingApplicationId =
            applicationId;

        /* Fill the form */
        document.querySelector(
            "#company"
        ).value =
            application.company;

        document.querySelector(
            "#role"
        ).value =
            application.role;

        document.querySelector(
            "#location"
        ).value =
            application.location || "";

        document.querySelector(
            "#status"
        ).value =
            application.status;

        document.querySelector(
            "#application-date"
        ).value =
            application.applicationDate || "";

        document.querySelector(
            "#salary"
        ).value =
            application.salary || "";

        document.querySelector(
            "#closing-date"
        ).value =
            application.closingDate || "";

        document.querySelector(
            "#job-url"
        ).value =
            application.jobUrl || "";

        document.querySelector(
            "#notes"
        ).value =
            application.notes || "";

        /* Update modal */
        document.querySelector(
            ".modal-header h2"
        ).textContent =
            "Edit Job Application";

        document.querySelector(
            "#submit-application"
        ).textContent =
            "Save Changes";

        modal.classList.add(
            "active"
        );
    }
);