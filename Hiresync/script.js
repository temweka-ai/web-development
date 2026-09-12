/* =========================================================
   HIRESYNC — JAVASCRIPT
   This file controls the behaviour and functionality
   of the HireSync dashboard.
   ========================================================= */


/* =========================================
   APPLICATION DATA
   ========================================= */

// Demo applications for the first time HireSync is opened
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


/* =========================================
   LOCAL STORAGE
   ========================================= */

// Check if HireSync already has saved applications
const savedApplications = localStorage.getItem("hiresyncApplications");

// If saved applications exist, load them.
// Otherwise, start with our demo applications.
let applications = savedApplications
    ? JSON.parse(savedApplications)
    : defaultApplications;

/* =========================================
   EDIT MODE
   ========================================= */

// Stores the ID of the application currently
// being edited.
//
// null means we are adding a new application.
let editingApplicationId = null;

/* =========================================
   SAVE APPLICATIONS
   ========================================= */

// Saves the current applications to the browser
function saveApplications() {
    localStorage.setItem(
        "hiresyncApplications",
        JSON.stringify(applications)
    );
}


/* =========================================================
   2. FIND HTML ELEMENTS
   ---------------------------------------------------------
   document.querySelector() allows JavaScript to find
   elements from our HTML.

   We store them in variables so we can update them later.
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
   SEARCH & STATUS FILTER
   ========================================================= */

searchApplications.addEventListener("input", () => {

    renderApplications();

});


statusFilter.addEventListener("change", () => {

    renderApplications();

});

/* =========================================================
   3. UPDATE DASHBOARD STATISTICS
   ---------------------------------------------------------
   This function calculates the numbers that appear
   inside our dashboard cards.
   ========================================================= */

function updateStatistics() {

    /* Count applications currently at Assessment */

    const assessments = applications.filter(
        application => application.status === "Assessment"
    );

    totalAssessments.textContent =
        assessments.length;

    /* Count every application */
    totalApplications.textContent =
        applications.length;


    /* Count applications currently at Interview */
    const interviews = applications.filter(
        application => application.status === "Interview"
    );

    totalInterviews.textContent =
        interviews.length;


    /* Count applications that became Offers */
    const offers = applications.filter(
        application => application.status === "Offer"
    );

    totalOffers.textContent =
        offers.length;


    /* Calculate response rate */
    const responses = applications.filter(
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

        responseRate.textContent = "0%";

    }

}


/* =========================================================
   4. FIND KANBAN COLUMNS
   ---------------------------------------------------------
   These elements are where our applications will appear.

   For now we're connecting the JavaScript to the
   three columns we created in index.html.
   ========================================================= */

const kanbanColumns =
    document.querySelectorAll(".kanban-column");


/* =========================================
   RENDER APPLICATIONS
   ========================================= */

// Displays all applications on the dashboard
/* =========================================
   RENDER APPLICATIONS
   Builds every application card.
   ========================================= */

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
            application.company.toLowerCase().includes(searchTerm) ||
            application.role.toLowerCase().includes(searchTerm) ||
           (application.location || "").toLowerCase().includes(searchTerm);

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

            <p class="application-role">${application.role}</p>

            ${application.location
                ? `<p class="application-location">📍 ${application.location}</p>`
                : ""}

            ${application.applicationDate
                ? `<p class="application-date">📅 ${application.applicationDate}</p>`
                : ""}

                ${application.salary
    ? `<p class="application-salary">💰 ${application.salary}</p>`
    : ""}

${application.closingDate
    ? `<p class="application-closing-date">⏳ Closes: ${application.closingDate}</p>`
    : ""}

${application.jobUrl
    ? `<p class="application-url">
        🔗 <a href="${application.jobUrl}" target="_blank" rel="noopener noreferrer">View Job Posting</a>
    </p>`
    : ""}

${application.notes
    ? `<p class="application-notes">📝 ${application.notes}</p>`
    : ""}

            <div class="application-actions">
                <button class="edit-btn" data-id="${application.id}">Edit</button>
                <button class="delete-btn" data-id="${application.id}">Delete</button>
            </div>
        `;

        card.addEventListener("dragstart", (event) => {

    card.classList.add("dragging");

    event.dataTransfer.setData("text/plain", application.id);
    event.dataTransfer.effectAllowed = "move";

});

card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
});

        const targetColumn = [...kanbanColumns].find(column => {

            return column.querySelector(".column-header span").textContent.trim()
                === application.status;

        });

        targetColumn.querySelector(".application-list").appendChild(card);

    });

    updateColumnCounts();

}


/* =========================================================
   6. UPDATE COLUMN COUNTERS
   ---------------------------------------------------------
   Shows how many applications exist inside each
   Kanban status.
   ========================================================= */

function updateColumnCounts() {

    kanbanColumns.forEach(column => {

        const columnTitle =
            column.querySelector(
                ".column-header span"
            );


        const count =
            column.querySelector(
                ".column-count"
            );


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

/* =========================================
   DRAG AND DROP
   Move cards between columns.
========================================= */

document.querySelectorAll(".application-list").forEach(list => {

    list.addEventListener("dragover", event => {
        event.preventDefault();
    });

    list.addEventListener("drop", event => {

    event.preventDefault();

    const id = Number(event.dataTransfer.getData("text/plain"));

    const application = applications.find(app => app.id === id);

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

/* =========================================================
   8. INITIAL DASHBOARD LOAD
   ---------------------------------------------------------
   These functions run when the page first loads.
   ========================================================= */

updateStatistics();

renderApplications();

updateColumnCounts();

/* =========================================================
   9. APPLICATION MODAL
   ---------------------------------------------------------
   Controls opening and closing of the Add Application
   window.
   ========================================================= */

const modal =
    document.querySelector("#application-modal");

const openModalButton =
    document.querySelector("#open-modal");

const closeModalButton =
    document.querySelector("#close-modal");

const cancelModalButton =
    document.querySelector("#cancel-modal");


/* Open the modal */

openModalButton.addEventListener("click", () => {

    modal.classList.add("active");

});


/* Close the modal */

closeModalButton.addEventListener("click", () => {

    modal.classList.remove("active");

});


/* Cancel the form */

cancelModalButton.addEventListener("click", () => {

    modal.classList.remove("active");

});


/* Close modal when clicking outside the form */

modal.addEventListener("click", (event) => {

    if (event.target === modal) {

        modal.classList.remove("active");

    }

});


/* =========================================================
   10. ADD NEW APPLICATION
   ---------------------------------------------------------
   Takes information from the form and creates a new
   application object.
   ========================================================= */

const applicationForm =
    document.querySelector("#application-form");


applicationForm.addEventListener("submit", (event) => {

    /* Prevents the browser from refreshing the page */

    event.preventDefault();


    /* Get information from the form */

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


    /* =========================================
   EDIT EXISTING APPLICATION
   ========================================= */

if (editingApplicationId !== null) {

    /* Find the application we're editing */
    const application = applications.find(
        application => application.id === editingApplicationId
    );


    /* Update its information */
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


    /* Save the updated application */
    saveApplications();

} else {

    /* =========================================
       CREATE NEW APPLICATION
       ========================================= */

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


    /* Add the new application */
    applications.push(newApplication);


    /* Save the new application */
    saveApplications();

}

// Save the updated applications to Local Storage
    saveApplications();

    updateStatistics();

    renderApplications();

    updateColumnCounts();


    /* Reset the form */
applicationForm.reset();

/* Return to Add mode */
editingApplicationId = null;

/* Restore the original modal heading */
document.querySelector(".modal-header h2").textContent =
    "Add Job Application";

/* Restore the original button text */
document.querySelector("#submit-application").textContent =
    "Add Application";


    /* Close the modal */

    modal.classList.remove("active");

});

/* =========================================================
   11. DELETE APPLICATION
   ---------------------------------------------------------
   Allows the user to remove an application from HireSync.
   The change is also saved to Local Storage.
   ========================================================= */

document.addEventListener("click", (event) => {

    /* Check if the clicked element is a Delete button */
    if (event.target.classList.contains("delete-btn")) {

        /* Get the ID stored on the button */
        const applicationId = Number(
            event.target.dataset.id
        );


        /* Ask for confirmation before deleting */
        const confirmDelete = confirm(
            "Are you sure you want to delete this application?"
        );


        /* Stop if the user chooses Cancel */
        if (!confirmDelete) {
            return;
        }


        /* Remove the application from the array */
        applications = applications.filter(
            application => application.id !== applicationId
        );


        /* Save the updated array */
        saveApplications();


        /* Update the dashboard */
        updateStatistics();

        renderApplications();

        updateColumnCounts();

    }

});

/* =========================================================
   12. EDIT APPLICATION
   ---------------------------------------------------------
   Loads an existing application into the modal so the
   user can change its information.
   ========================================================= */

document.addEventListener("click", (event) => {

    /* Check if the clicked element is an Edit button */
    if (event.target.classList.contains("edit-btn")) {

        /* Get the application ID from the button */
        const applicationId = Number(
            event.target.dataset.id
        );


        /* Find the application in our array */
        const application = applications.find(
            application => application.id === applicationId
        );


        /* Stop if the application cannot be found */
        if (!application) {
            return;
        }


        /* Store the ID so we know which application
           we're editing when the form is submitted */
        editingApplicationId = applicationId;


        /* Fill the modal with the application's
           existing information */
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


        /* Change the modal heading */
        document.querySelector(".modal-header h2").textContent =
            "Edit Job Application";


        /* Change the submit button text */
        document.querySelector("#submit-application").textContent =
            "Save Changes";


        /* Open the modal */
        modal.classList.add("active");

    }

});     