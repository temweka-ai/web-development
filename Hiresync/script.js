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
   DYNAMIC GREETING
   ========================================================= */

function updateGreeting() {
    const greetingElement = document.getElementById("greeting");

    if (!greetingElement) {
        return;
    }

    const hour = new Date().getHours();

    let greeting;

    if (hour >= 5 && hour < 12) {
        greeting = "Good morning";
    } else if (hour >= 12 && hour < 18) {
        greeting = "Good afternoon";
    } else {
        greeting = "Good evening";
    }

    greetingElement.textContent = `${greeting}, Temweka.`;
}

/* =========================================================
   SAVE APPLICATIONS
   ========================================================= */

function saveApplications() {
    localStorage.setItem(
        "hiresyncApplications",
        JSON.stringify(applications)
    );

    updateUpcomingInterviews();
}

/* =========================================================
   UPCOMING INTERVIEWS
   ========================================================= */

function updateUpcomingInterviews() {
    const upcomingInterviews =
        document.querySelector("#upcoming-interviews");

    if (!upcomingInterviews) {
        return;
    }

    const now = new Date();

    const interviews = applications
        .filter(
            application =>
                application.status === "Interview" &&
                application.interviewDate
        )
        .map(application => {
            const interviewDateTime = new Date(
                `${application.interviewDate}T${application.interviewTime || "23:59"}`
            );

            return {
                application,
                interviewDateTime
            };
        })
        .filter(
            interview =>
                interview.interviewDateTime >= now
        )
        .sort(
            (a, b) =>
                a.interviewDateTime -
                b.interviewDateTime
        );

    if (interviews.length === 0) {
        upcomingInterviews.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    +
                </div>

                <h3>
                    No upcoming interviews
                </h3>

                <p>
                    Interviews you schedule in HireSync
                    will appear here.
                </p>
            </div>
        `;

        return;
    }

    upcomingInterviews.innerHTML = "";

    interviews.forEach(
        ({ application, interviewDateTime }) => {
            const card =
                document.createElement("div");

            card.className =
                "interview-card";

            const date =
                interviewDateTime.toLocaleDateString(
                    undefined,
                    {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                    }
                );

            const time =
                application.interviewTime
                    ? interviewDateTime.toLocaleTimeString(
                        undefined,
                        {
                            hour: "numeric",
                            minute: "2-digit"
                        }
                    )
                    : "Time not set";

            card.innerHTML = `
                <div class="interview-card-header">
                    <div>
                        <h3>
                            ${application.company}
                        </h3>

                        <p>
                            ${application.role}
                        </p>
                    </div>

                    <span>
                        INTERVIEW
                    </span>
                </div>

                <div class="interview-details">
                    <p>
                        📅 ${date}
                    </p>

                    <p>
                        🕒 ${time}
                    </p>

                    ${
                        application.location
                            ? `
                                <p>
                                    📍 ${application.location}
                                </p>
                            `
                            : ""
                    }
                </div>
            `;

            upcomingInterviews.appendChild(card);
        }
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

    if (totalAssessments) {
        totalAssessments.textContent =
            assessments.length;
    }

    if (totalApplications) {
        totalApplications.textContent =
            applications.length;
    }

    const interviews =
        applications.filter(
            application =>
                application.status === "Interview"
        );

    if (totalInterviews) {
        totalInterviews.textContent =
            interviews.length;
    }

    const offers =
        applications.filter(
            application =>
                application.status === "Offer"
        );

    if (totalOffers) {
        totalOffers.textContent =
            offers.length;
    }

    const responses =
        applications.filter(
            application =>
                application.status !== "Applied"
        );

    if (responseRate) {
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

    const summaryApplied =
        document.querySelector("#summary-applied");

    const summaryAssessment =
        document.querySelector("#summary-assessment");

    const summaryInterview =
        document.querySelector("#summary-interview");

    const summaryOffer =
        document.querySelector("#summary-offer");

    const summaryRejected =
        document.querySelector("#summary-rejected");

    summaryTotal.textContent =
        applications.length;

    if (summaryApplied) {
        summaryApplied.textContent =
            applications.filter(
                application =>
                    application.status === "Applied"
            ).length;
    }

    if (summaryAssessment) {
        summaryAssessment.textContent =
            applications.filter(
                application =>
                    application.status === "Assessment"
            ).length;
    }

    if (summaryInterview) {
        summaryInterview.textContent =
            applications.filter(
                application =>
                    application.status === "Interview"
            ).length;
    }

    if (summaryOffer) {
        summaryOffer.textContent =
            applications.filter(
                application =>
                    application.status === "Offer"
            ).length;
    }

    if (summaryRejected) {
        summaryRejected.textContent =
            applications.filter(
                application =>
                    application.status === "Rejected"
            ).length;
    }
}

/* =========================================================
   CLOSING DATE STATUS
   ========================================================= */

function getClosingDateStatus(closingDate) {
    if (!closingDate) {
        return {
            className: "",
            label: ""
        };
    }

    const today = new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    const deadline =
        new Date(
            closingDate + "T00:00:00"
        );

    const difference =
        Math.ceil(
            (deadline - today) /
            (1000 * 60 * 60 * 24)
        );

    if (difference < 0) {
        return {
            className: "closing-overdue",
            label: "⚠️ Closing date passed"
        };
    }

    if (difference === 0) {
        return {
            className: "closing-today",
            label: "🔴 Closes today"
        };
    }

    if (difference <= 3) {
        return {
            className: "closing-soon",
            label: `🟡 Closes in ${difference} day${difference === 1 ? "" : "s"}`
        };
    }

    return {
        className: "closing-normal",
        label: `⏳ Closes in ${difference} days`
    };
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
                    selectedStatus === "All"
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
                        ? (() => {
                            const closingStatus =
                                getClosingDateStatus(
                                    application.closingDate
                                );

                            return `
                                <div class="application-closing ${closingStatus.className}">
                                    <strong>
                                        ${closingStatus.label}
                                    </strong>

                                    <span>
                                        Deadline: ${application.closingDate}
                                    </span>
                                </div>
                            `;
                        })()
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
                    selectedStatus === "all"
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

            card.draggable = true;

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
                        ? (() => {
                            const closingStatus =
                                getClosingDateStatus(
                                    application.closingDate
                                );

                            return `
                                <div class="application-closing ${closingStatus.className}">
                                    <strong>
                                        ${closingStatus.label}
                                    </strong>

                                    <span>
                                        Deadline: ${application.closingDate}
                                    </span>
                                </div>
                            `;
                        })()
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
                const applicationList =
                    targetColumn.querySelector(
                        ".application-list"
                    );

                if (applicationList) {
                    applicationList.appendChild(card);
                }
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
                    updateUpcomingInterviews();
                    renderInterviewsPage();
                    renderAnalyticsPage();
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

            const modalTitle =
                document.querySelector(
                    ".modal-header h2"
                );

            const submitButton =
                document.querySelector(
                    "#submit-application"
                );

            if (modalTitle) {
                modalTitle.textContent =
                    "Add Job Application";
            }

            if (submitButton) {
                submitButton.textContent =
                    "Add Application";
            }

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

            const interviewDate =
                document.querySelector(
                    "#interview-date"
                ).value;

            const interviewTime =
                document.querySelector(
                    "#interview-time"
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

                    application.interviewDate =
                        interviewDate;

                    application.interviewTime =
                        interviewTime;

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
                    applicationDate: applicationDate,
                    interviewDate: interviewDate,
                    interviewTime: interviewTime,
                    salary: salary,
                    closingDate: closingDate,
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
            updateUpcomingInterviews();
            renderInterviewsPage();
            renderAnalyticsPage();

            /* Reset form */

            applicationForm.reset();

            editingApplicationId =
                null;

            /* Restore Add mode */

            const modalTitle =
                document.querySelector(
                    ".modal-header h2"
                );

            const submitButton =
                document.querySelector(
                    "#submit-application"
                );

            if (modalTitle) {
                modalTitle.textContent =
                    "Add Job Application";
            }

            if (submitButton) {
                submitButton.textContent =
                    "Add Application";
            }

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
        renderInterviewsPage();
        renderAnalyticsPage();
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

        if (!hasApplicationModal) {
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
            "#interview-date"
        ).value =
            application.interviewDate || "";

        document.querySelector(
            "#interview-time"
        ).value =
            application.interviewTime || "";

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

        const modalTitle =
            document.querySelector(
                ".modal-header h2"
            );

        const submitButton =
            document.querySelector(
                "#submit-application"
            );

        if (modalTitle) {
            modalTitle.textContent =
                "Edit Job Application";
        }

        if (submitButton) {
            submitButton.textContent =
                "Save Changes";
        }

        modal.classList.add(
            "active"
        );
    }
);

/* =========================================================
   INTERVIEWS PAGE
   ========================================================= */

function renderInterviewsPage() {
    const interviewsList =
        document.querySelector(
            "#interviewsList"
        );

    if (!interviewsList) {
        return;
    }

    const totalElement =
        document.querySelector(
            "#interview-total"
        );

    const upcomingElement =
        document.querySelector(
            "#interview-upcoming"
        );

    const todayElement =
        document.querySelector(
            "#interview-today"
        );

    const completedElement =
        document.querySelector(
            "#interview-completed"
        );

    const now = new Date();

    const today = new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    const interviews =
        applications
            .filter(
                application =>
                    application.status === "Interview" &&
                    application.interviewDate
            )
            .map(application => {
                const dateTime =
                    new Date(
                        `${application.interviewDate}T${application.interviewTime || "23:59"}`
                    );

                return {
                    application,
                    dateTime
                };
            })
            .sort(
                (a, b) =>
                    a.dateTime - b.dateTime
            );

    const upcoming =
        interviews.filter(
            interview =>
                interview.dateTime >= now
        );

    const todayInterviews =
        interviews.filter(
            interview => {
                const interviewDay =
                    new Date(
                        interview.application.interviewDate
                    );

                interviewDay.setHours(
                    0,
                    0,
                    0,
                    0
                );

                return (
                    interviewDay.getTime() ===
                    today.getTime()
                );
            }
        );

    const completed =
        interviews.filter(
            interview =>
                interview.dateTime < now
        );

    if (totalElement) {
        totalElement.textContent =
            interviews.length;
    }

    if (upcomingElement) {
        upcomingElement.textContent =
            upcoming.length;
    }

    if (todayElement) {
        todayElement.textContent =
            todayInterviews.length;
    }

    if (completedElement) {
        completedElement.textContent =
            completed.length;
    }

    if (interviews.length === 0) {
        interviewsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    +
                </div>

                <h3>
                    No interviews scheduled
                </h3>

                <p>
                    Add an interview date and time
                    to an application to see it here.
                </p>
            </div>
        `;

        return;
    }

    interviewsList.innerHTML = "";

    interviews.forEach(
        ({ application, dateTime }) => {
            const card =
                document.createElement("div");

            card.className =
                "interview-card";

            const date =
                dateTime.toLocaleDateString(
                    undefined,
                    {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                );

            const time =
                application.interviewTime
                    ? dateTime.toLocaleTimeString(
                        undefined,
                        {
                            hour: "numeric",
                            minute: "2-digit"
                        }
                    )
                    : "Time not set";

            const completedLabel =
                dateTime < now
                    ? "COMPLETED"
                    : "UPCOMING";

            card.innerHTML = `
                <div class="interview-card-header">
                    <div>
                        <h3>
                            ${application.company}
                        </h3>

                        <p>
                            ${application.role}
                        </p>
                    </div>

                    <span>
                        ${completedLabel}
                    </span>
                </div>

                <div class="interview-details">
                    <p>
                        📅 ${date}
                    </p>

                    <p>
                        🕒 ${time}
                    </p>

                    ${
                        application.location
                            ? `
                                <p>
                                    📍 ${application.location}
                                </p>
                            `
                            : ""
                    }
                </div>
            `;

            interviewsList.appendChild(card);
        }
    );
}

/* =========================================================
   ANALYTICS PAGE
   ========================================================= */

function renderAnalyticsPage() {

    const breakdown =
        document.querySelector("#analytics-breakdown");

    if (!breakdown) {
        return;
    }

    const total = applications.length;

    const applied =
        applications.filter(
            application =>
                application.status === "Applied"
        ).length;

    const assessment =
        applications.filter(
            application =>
                application.status === "Assessment"
        ).length;

    const interviews =
        applications.filter(
            application =>
                application.status === "Interview"
        ).length;

    const offers =
        applications.filter(
            application =>
                application.status === "Offer"
        ).length;

    const rejected =
        applications.filter(
            application =>
                application.status === "Rejected"
        ).length;

    const active =
        applied +
        assessment +
        interviews;

    const responses =
        assessment +
        interviews +
        offers +
        rejected;

    const responseRate =
        total > 0
            ? Math.round((responses / total) * 100)
            : 0;

    const interviewRate =
        total > 0
            ? Math.round((interviews / total) * 100)
            : 0;

    const offerRate =
        total > 0
            ? Math.round((offers / total) * 100)
            : 0;


    /* Update summary */

    const analyticsTotal =
        document.querySelector("#analytics-total");

    const analyticsActive =
        document.querySelector("#analytics-active");

    const analyticsInterviews =
        document.querySelector("#analytics-interviews");

    const analyticsOffers =
        document.querySelector("#analytics-offers");

    const analyticsResponseRate =
        document.querySelector("#analytics-response-rate");

    const analyticsInterviewRate =
        document.querySelector("#analytics-interview-rate");

    const analyticsOfferRate =
        document.querySelector("#analytics-offer-rate");


    if (analyticsTotal) {
        analyticsTotal.textContent = total;
    }

    if (analyticsActive) {
        analyticsActive.textContent = active;
    }

    if (analyticsInterviews) {
        analyticsInterviews.textContent = interviews;
    }

    if (analyticsOffers) {
        analyticsOffers.textContent = offers;
    }

    if (analyticsResponseRate) {
        analyticsResponseRate.textContent =
            `${responseRate}%`;
    }

    if (analyticsInterviewRate) {
        analyticsInterviewRate.textContent =
            `${interviewRate}%`;
    }

    if (analyticsOfferRate) {
        analyticsOfferRate.textContent =
            `${offerRate}%`;
    }


    /* Empty state */

    if (total === 0) {

        breakdown.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    +
                </div>

                <h3>
                    No analytics yet
                </h3>

                <p>
                    Add applications to start
                    generating career insights.
                </p>

            </div>
        `;

        return;
    }


    /* Application breakdown */

    const stages = [
        {
            label: "Applied",
            count: applied
        },
        {
            label: "Assessment",
            count: assessment
        },
        {
            label: "Interview",
            count: interviews
        },
        {
            label: "Offer",
            count: offers
        },
        {
            label: "Rejected",
            count: rejected
        }
    ];


    breakdown.innerHTML = `
        <div class="analytics-breakdown">

            ${stages.map(stage => {

                const percentage =
                    (stage.count / total) * 100;

                return `
                    <div class="analytics-row">

                        <div class="analytics-label">
                            ${stage.label}
                        </div>

                        <div class="analytics-bar">

                            <div
                                class="analytics-bar-fill"
                                style="width: ${percentage}%"
                            ></div>

                        </div>

                        <div class="analytics-count">
                            ${stage.count}
                        </div>

                    </div>
                `;

            }).join("")}

        </div>
    `;
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
updateUpcomingInterviews();
renderInterviewsPage();
renderAnalyticsPage();
updateGreeting();