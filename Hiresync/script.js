(() => {
    /* =========================================================
       JOBTSELA JAVASCRIPT
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

    function safeGetStorageItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn(`localStorage access failed for "${key}"`, error);
            return null;
        }
    }

    function safeParseJSON(value, fallback) {
        if (!value) return fallback;

        try {
            return JSON.parse(value);
        } catch (error) {
            console.error("Could not parse stored JSON:", error);
            return fallback;
        }
    }

    function normalizeApplication(app = {}) {
        return {
            ...app,
            id: Number(app.id ?? Date.now()),
            company: String(app.company ?? "").trim(),
            role: String(app.role ?? "").trim(),
            location: String(app.location ?? "").trim(),
            status: String(app.status ?? "Applied").trim(),
            applicationDate: app.applicationDate ?? "",
            interviewDate: app.interviewDate ?? "",
            interviewTime: app.interviewTime ?? "",
            salary: app.salary ?? "",
            closingDate: app.closingDate ?? "",
            jobUrl: app.jobUrl ?? "",
            notes: app.notes ?? ""
        };
    }

    const savedApplications = safeGetStorageItem("jobtselaApplications");
    const legacyApplications = safeGetStorageItem("hiresyncApplications");

    let applications;

    if (savedApplications) {
        applications = safeParseJSON(savedApplications, defaultApplications);
    } else if (legacyApplications) {
        applications = safeParseJSON(legacyApplications, defaultApplications);

        try {
            localStorage.setItem("jobtselaApplications", JSON.stringify(applications));
        } catch (error) {
            console.warn("Could not migrate legacy applications:", error);
        }
    } else {
        applications = defaultApplications;
    }

    if (!Array.isArray(applications) || applications.length === 0) {
        applications = defaultApplications;
    }

    applications = applications.map(normalizeApplication);
    let editingApplicationId = null;

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizeText(text) {
        return String(text || "")
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function updateGreeting() {
        const greetingElement = document.getElementById("greeting");
        if (!greetingElement) return;

        let userName = "Temweka";

        const savedUser = safeGetStorageItem("jobtselaUser");
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                if (user.name) userName = user.name;
            } catch (error) {
                console.error("Could not load saved Google user.", error);
            }
        }

        const hour = new Date().getHours();
        let greeting = "Good evening";

        if (hour >= 5 && hour < 12) {
            greeting = "Good morning";
        } else if (hour >= 12 && hour < 18) {
            greeting = "Good afternoon";
        }

        greetingElement.textContent = `${greeting}, ${userName}.`;
    }

    window.handleCredentialResponse = function (response) {
        if (!response || !response.credential) {
            console.error("Google credential response is missing.");
            return;
        }

        try {
            const payload = JSON.parse(
                atob(
                    response.credential
                        .split(".")[1]
                        .replace(/-/g, "+")
                        .replace(/_/g, "/")
                )
            );

            const user = {
                id: payload.sub,
                name: payload.name,
                email: payload.email,
                picture: payload.picture
            };

            try {
                localStorage.setItem("jobtselaUser", JSON.stringify(user));
            } catch (error) {
                console.warn("Could not save Google user:", error);
            }

            updateGreeting();
            console.log("Google user signed in:", user);
        } catch (error) {
            console.error("Google sign-in failed:", error);
        }
    };

    let gmailTokenClient = null;
    let gmailAccessToken = null;

    function updateGmailStatus(statusText = "Connect Gmail", connected = false) {
        const gmailButton = document.querySelector("#connect-gmail");
        const aiStatus = document.querySelector("#ai-status");

        if (gmailButton) {
            gmailButton.textContent = statusText;
            gmailButton.disabled = connected;
        }

        if (aiStatus) {
            aiStatus.textContent = connected ? "● GMAIL CONNECTED" : "● GMAIL STANDBY";
        }
    }

    function initializeGmailOAuth() {
        if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
            console.error("Google OAuth library is not available.");
            updateGmailStatus("Gmail unavailable", false);
            return false;
        }

        gmailTokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: "305432009603-cl1fnje5n7mkrvh5tpkii4d0pu8fdpon.apps.googleusercontent.com",
            scope: "https://www.googleapis.com/auth/gmail.readonly",
            callback: async function (response) {
                if (response.error) {
                    console.error("Gmail authorization failed:", response);
                    updateGmailStatus("Gmail authorization failed", false);
                    return;
                }

                gmailAccessToken = response.access_token;
                updateGmailStatus("Gmail Connected", true);
                await loadGmailMessages();
            }
        });

        return true;
    }

    function decodeGmailBody(data) {
        if (!data) return "";

        try {
            let base64 = data.replace(/-/g, "+").replace(/_/g, "/");

            while (base64.length % 4) {
                base64 += "=";
            }

            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);

            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            return new TextDecoder("utf-8").decode(bytes);
        } catch (error) {
            console.error("Failed to decode Gmail body:", error);
            return "";
        }
    }

    function stripHTML(html) {
        if (!html) return "";

        const temp = document.createElement("div");
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || "";
    }

    function extractGmailBody(payload) {
        if (!payload) return "";

        if (payload.body && payload.body.data) {
            const decoded = decodeGmailBody(payload.body.data);

            if (payload.mimeType === "text/html") {
                return stripHTML(decoded);
            }

            return decoded;
        }

        if (payload.parts && payload.parts.length) {
            for (const part of payload.parts) {
                if (part.mimeType === "text/plain" && part.body && part.body.data) {
                    return decodeGmailBody(part.body.data);
                }
            }

            for (const part of payload.parts) {
                if (part.mimeType === "text/html" && part.body && part.body.data) {
                    return stripHTML(decodeGmailBody(part.body.data));
                }
            }

            for (const part of payload.parts) {
                const body = extractGmailBody(part);
                if (body) return body;
            }
        }

        return "";
    }

    function parseGmailMessage(message) {
        if (!message) return null;

        const headers = message.payload?.headers || [];
        const getHeader = (name) => {
            const header = headers.find(
                (header) => header.name.toLowerCase() === name.toLowerCase()
            );

            return header ? header.value : "";
        };

        const sender = getHeader("From");
        const subject = getHeader("Subject");
        const date = getHeader("Date");
        const body = extractGmailBody(message.payload);

        return {
            id: message.id,
            sender,
            subject,
            date,
            body
        };
    }

    function connectGmail() {
        const initialized = initializeGmailOAuth();

        if (!initialized) {
            console.error("Gmail connection could not be initialized.");
            return;
        }

        if (!gmailTokenClient) {
            console.error("Gmail token client is not available.");
            return;
        }

        gmailTokenClient.requestAccessToken({ prompt: "consent" });
    }

    function matchGmailToApplication(message) {
        if (!message) return null;

        const messageText = normalizeText(
            `${message.subject || ""} ${message.sender || ""} ${message.body || ""}`
        );

        if (!messageText) return null;

        let bestMatch = null;
        let bestScore = 0;

        applications.forEach((application) => {
            const company = normalizeText(application?.company || "");
            const role = normalizeText(application?.role || "");

            if (!company) return;

            let score = 0;

            if (messageText.includes(company)) {
                score += 5;
            }

            const companyWords = company.split(" ").filter((word) => word.length >= 4);

            companyWords.forEach((word) => {
                if (messageText.includes(word)) {
                    score += 1;
                }
            });

            if (role && messageText.includes(role)) {
                score += 3;
            }

            const roleWords = role
                .split(" ")
                .filter((word) =>
                    word.length >= 4 &&
                    ![
                        "junior",
                        "senior",
                        "developer",
                        "software",
                        "position",
                        "application",
                        "career",
                        "remote"
                    ].includes(word)
                );

            roleWords.forEach((word) => {
                if (messageText.includes(word)) {
                    score += 1;
                }
            });

            if (score > bestScore && score >= 5) {
                bestScore = score;
                bestMatch = application;
            }
        });

        return bestMatch;
    }

    function buildGmailAnalysis(message, category, relevance) {
        const analysed = {
            ...message,
            category,
            relevance
        };

        analysed.matchedApplication = matchGmailToApplication(analysed);
        return analysed;
    }

    function analyseGmailMessage(message) {
        const subject = normalizeText(message.subject);
        const sender = normalizeText(message.sender);
        const body = normalizeText(message.body);
        const fullText = `${subject} ${sender} ${body}`;

        const linkedinSocialKeywords = [
            "new post for you",
            "is popular in your network",
            "recently posted",
            "new invitation",
            "hired near you",
            "new connection",
            "liked your",
            "commented on your",
            "celebrated",
            "view profile",
            "co founder recently posted"
        ];

        if (
            sender.includes("linkedin") &&
            linkedinSocialKeywords.some((keyword) =>
                fullText.includes(normalizeText(keyword))
            )
        ) {
            return buildGmailAnalysis(message, "NOISE", "LOW");
        }

        const noiseKeywords = [
            "games",
            "solve zip",
            "solve the puzzle",
            "newsletter",
            "daily digest",
            "unsubscribe"
        ];

        if (
            noiseKeywords.some((keyword) =>
                subject.includes(normalizeText(keyword))
            )
        ) {
            return buildGmailAnalysis(message, "NOISE", "LOW");
        }

        const interviewKeywords = [
            "interview",
            "interview invitation",
            "interview request",
            "schedule your interview",
            "schedule an interview",
            "invite you to an interview",
            "next round interview",
            "interview process",
            "meet with our team",
            "meet the team"
        ];

        if (
            interviewKeywords.some((keyword) =>
                fullText.includes(normalizeText(keyword))
            )
        ) {
            return buildGmailAnalysis(message, "INTERVIEW", "HIGH");
        }

        const assessmentKeywords = [
            "assessment",
            "online assessment",
            "coding assessment",
            "technical assessment",
            "coding challenge",
            "technical test",
            "coding test",
            "take the assessment",
            "complete the assessment"
        ];

        if (
            assessmentKeywords.some((keyword) =>
                fullText.includes(normalizeText(keyword))
            )
        ) {
            return buildGmailAnalysis(message, "ASSESSMENT", "HIGH");
        }

        const offerKeywords = [
            "job offer",
            "offer letter",
            "offer of employment",
            "employment offer",
            "pleased to offer",
            "offer you the position",
            "offer you the role"
        ];

        if (
            offerKeywords.some((keyword) =>
                fullText.includes(normalizeText(keyword))
            )
        ) {
            return buildGmailAnalysis(message, "OFFER", "HIGH");
        }

        const rejectionKeywords = [
            "application unsuccessful",
            "not been successful",
            "not selected",
            "unsuccessful application",
            "will not be progressing",
            "not moving forward",
            "we regret to inform",
            "decided not to proceed"
        ];

        if (
            rejectionKeywords.some((keyword) =>
                fullText.includes(normalizeText(keyword))
            )
        ) {
            return buildGmailAnalysis(message, "REJECTION", "MEDIUM");
        }

        const applicationKeywords = [
            "application received",
            "application submitted",
            "thank you for applying",
            "thanks for applying",
            "application has been received",
            "we received your application",
            "thank you for your application",
            "application confirmation",
            "your application for"
        ];

        if (
            applicationKeywords.some((keyword) =>
                fullText.includes(normalizeText(keyword))
            )
        ) {
            return buildGmailAnalysis(message, "APPLICATION", "MEDIUM");
        }

        const recruiterKeywords = [
            "recruiter",
            "recruitment",
            "talent acquisition",
            "hiring manager",
            "career opportunity",
            "job opportunity",
            "position available",
            "we are hiring",
            "talent team",
            "recruiting team"
        ];

        if (
            recruiterKeywords.some((keyword) =>
                fullText.includes(normalizeText(keyword))
            )
        ) {
            return buildGmailAnalysis(message, "RECRUITER", "HIGH");
        }

        const recruitmentKeywords = [
            "job",
            "jobs",
            "hiring",
            "hired",
            "vacancy",
            "position",
            "career",
            "developer",
            "development",
            "software",
            "internship",
            "intern",
            "recruiting",
            "recruitment",
            "candidate",
            "apply",
            "application",
            "role",
            "openings",
            "cyber security",
            "data entry",
            "customer support",
            "call center",
            "appointment setter",
            "job opportunity",
            "job opening",
            "employment"
        ];

        if (
            recruitmentKeywords.some((keyword) =>
                fullText.includes(normalizeText(keyword))
            )
        ) {
            return buildGmailAnalysis(message, "RECRUITMENT", "MEDIUM");
        }

        return buildGmailAnalysis(message, "OTHER", "LOW");
    }

    async function loadGmailMessages() {
        if (!gmailAccessToken) {
            console.error("Gmail is not connected.");
            updateGmailStatus("Connect Gmail", false);
            return;
        }

        try {
            updateGmailStatus("Loading Gmail...", true);

            const listResponse = await fetch(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20",
                {
                    headers: {
                        Authorization: `Bearer ${gmailAccessToken}`
                    }
                }
            );

            if (listResponse.status === 401) {
                gmailAccessToken = null;
                console.error("Gmail access token expired or is invalid.");
                updateGmailStatus("Reconnect Gmail", false);
                return;
            }

            if (!listResponse.ok) {
                throw new Error(`Gmail message list error: ${listResponse.status}`);
            }

            const listData = await listResponse.json();
            const messages = listData.messages || [];
            const fullMessages = [];

            for (const message of messages) {
                try {
                    const messageResponse = await fetch(
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
                        {
                            headers: {
                                Authorization: `Bearer ${gmailAccessToken}`
                            }
                        }
                    );

                    if (messageResponse.status === 401) {
                        gmailAccessToken = null;
                        updateGmailStatus("Reconnect Gmail", false);
                        return;
                    }

                    if (!messageResponse.ok) {
                        console.error(`Failed to read Gmail message ${message.id}`);
                        continue;
                    }

                    const messageData = await messageResponse.json();
                    fullMessages.push(messageData);
                } catch (messageError) {
                    console.error(
                        `Error reading Gmail message ${message.id}:`,
                        messageError
                    );
                }
            }

            window.gmailMessages = fullMessages;

            const parsedMessages = fullMessages
                .map((message) => parseGmailMessage(message))
                .filter((message) => message !== null);

            window.parsedGmailMessages = parsedMessages;

            const analysedMessages = parsedMessages.map((message) =>
                analyseGmailMessage(message)
            );

            window.analysedGmailMessages = analysedMessages;

            window.analysedGmailMessages.sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB - dateA;
            });

            updateGmailStatus("Gmail Connected", true);
            updateAIInbox();
        } catch (error) {
            console.error("Failed to load Gmail messages:", error);
            updateGmailStatus("Gmail Error", false);
        }
    }

    function saveApplications() {
        try {
            localStorage.setItem(
                "jobtselaApplications",
                JSON.stringify(applications)
            );
        } catch (error) {
            console.warn("Could not save applications:", error);
        }

        updateUpcomingInterviews();
    }

    function updateUpcomingInterviews() {
        const upcomingInterviews = document.querySelector("#upcoming-interviews");
        if (!upcomingInterviews) return;

        const now = new Date();

        const interviews = applications
            .filter(
                (application) =>
                    application.status === "Interview" &&
                    application.interviewDate
            )
            .map((application) => {
                const interviewDateTime = new Date(
                    `${application.interviewDate}T${
                        application.interviewTime || "23:59"
                    }`
                );

                return { application, interviewDateTime };
            })
            .filter((interview) => interview.interviewDateTime >= now)
            .sort(
                (a, b) =>
                    a.interviewDateTime - b.interviewDateTime
            );

        if (interviews.length === 0) {
            upcomingInterviews.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">+</div>
                    <h3>No upcoming interviews</h3>
                    <p>Interviews you schedule in JobTsela will appear here.</p>
                </div>
            `;
            return;
        }

        upcomingInterviews.innerHTML = "";

        interviews.forEach(({ application, interviewDateTime }) => {
            const card = document.createElement("div");
            card.className = "interview-card";

            const date = interviewDateTime.toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
            });

            const time = application.interviewTime
                ? interviewDateTime.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit"
                  })
                : "Time not set";

            const completedLabel =
                interviewDateTime < now ? "COMPLETED" : "UPCOMING";

            card.innerHTML = `
                <div class="interview-card-header">
                    <div>
                        <h3>${escapeHTML(application.company)}</h3>
                        <p>${escapeHTML(application.role)}</p>
                    </div>
                    <span>${completedLabel}</span>
                </div>

                <div class="interview-details">
                    <p>📅 ${escapeHTML(date)}</p>
                    <p>🕒 ${escapeHTML(time)}</p>
                    ${
                        application.location
                            ? `<p>📍 ${escapeHTML(application.location)}</p>`
                            : ""
                    }
                </div>
            `;

            upcomingInterviews.appendChild(card);
        });
    }

    function getClosingDateStatus(closingDate) {
        if (!closingDate) return { className: "", label: "" };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deadline = new Date(`${closingDate}T00:00:00`);
        const difference = Math.ceil(
            (deadline - today) / (1000 * 60 * 60 * 24)
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
                label: `🟡 Closes in ${difference} day${
                    difference === 1 ? "" : "s"
                }`
            };
        }

        return {
            className: "closing-normal",
            label: `⏳ Closes in ${difference} days`
        };
    }

    function updateApplicationSummary() {
        const summaryTotal = document.querySelector("#summary-total");
        if (!summaryTotal) return;

        const summaryApplied = document.querySelector("#summary-applied");
        const summaryAssessment =
            document.querySelector("#summary-assessment");
        const summaryInterview =
            document.querySelector("#summary-interview");
        const summaryOffer = document.querySelector("#summary-offer");
        const summaryRejected =
            document.querySelector("#summary-rejected");

        summaryTotal.textContent = String(applications.length);

        if (summaryApplied) {
            summaryApplied.textContent = String(
                applications.filter(
                    (application) => application.status === "Applied"
                ).length
            );
        }

        if (summaryAssessment) {
            summaryAssessment.textContent = String(
                applications.filter(
                    (application) => application.status === "Assessment"
                ).length
            );
        }

        if (summaryInterview) {
            summaryInterview.textContent = String(
                applications.filter(
                    (application) => application.status === "Interview"
                ).length
            );
        }

        if (summaryOffer) {
            summaryOffer.textContent = String(
                applications.filter(
                    (application) => application.status === "Offer"
                ).length
            );
        }

        if (summaryRejected) {
            summaryRejected.textContent = String(
                applications.filter(
                    (application) => application.status === "Rejected"
                ).length
            );
        }
    }

    const totalApplications = document.querySelector("#total-applications");
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

    function updateStatistics() {
        const assessments = applications.filter(
            (application) => application.status === "Assessment"
        );

        if (totalAssessments) {
            totalAssessments.textContent = String(
                assessments.length
            );
        }

        if (totalApplications) {
            totalApplications.textContent = String(
                applications.length
            );
        }

        const interviews = applications.filter(
            (application) => application.status === "Interview"
        );

        if (totalInterviews) {
            totalInterviews.textContent = String(
                interviews.length
            );
        }

        const offers = applications.filter(
            (application) => application.status === "Offer"
        );

        if (totalOffers) {
            totalOffers.textContent = String(
                offers.length
            );
        }

        const responses = applications.filter(
            (application) => application.status !== "Applied"
        );

        if (responseRate) {
            responseRate.textContent =
                applications.length > 0
                    ? `${Math.round(
                          (responses.length / applications.length) * 100
                      )}%`
                    : "0%";
        }
    }

    const kanbanColumns =
        document.querySelectorAll(".kanban-column");
    const applicationsPageList =
        document.querySelector("#applicationsList");
    const applicationsPageSearch =
        document.querySelector("#applicationSearch");
    const applicationsPageFilter =
        document.querySelector("#applicationFilter");
    const applicationsPageSort =
        document.querySelector("#applicationSort");

    function renderApplicationsPage() {
        if (!applicationsPageList) return;

        updateApplicationSummary();

        const searchTerm = applicationsPageSearch
            ? applicationsPageSearch.value.toLowerCase().trim()
            : "";

        const selectedStatus = applicationsPageFilter
            ? applicationsPageFilter.value
            : "all";

        const filteredApplications = applications.filter(
            (application) => {
                const company = String(
                    application?.company ?? ""
                ).toLowerCase();

                const role = String(
                    application?.role ?? ""
                ).toLowerCase();

                const location = String(
                    application?.location ?? ""
                ).toLowerCase();

                const matchesSearch =
                    company.includes(searchTerm) ||
                    role.includes(searchTerm) ||
                    location.includes(searchTerm);

                const matchesStatus =
                    selectedStatus === "all" ||
                    selectedStatus === "All" ||
                    application.status === selectedStatus;

                return matchesSearch && matchesStatus;
            }
        );

        const sortedApplications =
            [...filteredApplications].sort((a, b) => {
                switch (
                    applicationsPageSort
                        ? applicationsPageSort.value
                        : "newest"
                ) {
                    case "oldest":
                        return (
                            new Date(
                                a.applicationDate ||
                                    "9999-12-31"
                            ) -
                            new Date(
                                b.applicationDate ||
                                    "9999-12-31"
                            )
                        );

                    case "company":
                        return String(
                            a.company || ""
                        ).localeCompare(
                            String(b.company || "")
                        );

                    case "closing":
                        return (
                            new Date(
                                a.closingDate ||
                                    "9999-12-31"
                            ) -
                            new Date(
                                b.closingDate ||
                                    "9999-12-31"
                            )
                        );

                    case "status":
                        return String(
                            a.status || ""
                        ).localeCompare(
                            String(b.status || "")
                        );

                    case "newest":
                    default:
                        return (
                            new Date(
                                b.applicationDate ||
                                    "0000-01-01"
                            ) -
                            new Date(
                                a.applicationDate ||
                                    "0000-01-01"
                            )
                        );
                }
            });

        applicationsPageList.innerHTML = "";

        sortedApplications.forEach((application) => {
            const card = document.createElement("div");
            card.className = "application-card";

            const statusClass = String(
                application.status || ""
            )
                .toLowerCase()
                .replace(/\s+/g, "-");

            card.innerHTML = `
                <div class="application-card-header">
                    <h3>${escapeHTML(application.company || "")}</h3>
                    <span class="application-status status-${statusClass}">
                        ${escapeHTML(application.status || "")}
                    </span>
                </div>

                <p class="application-role">${escapeHTML(
                    application.role || ""
                )}</p>

                ${
                    application.location
                        ? `<p class="application-location">📍 ${escapeHTML(
                              application.location
                          )}</p>`
                        : ""
                }

                ${
                    application.applicationDate
                        ? `<p class="application-date">📅 ${escapeHTML(
                              application.applicationDate
                          )}</p>`
                        : ""
                }

                ${
                    application.salary
                        ? `<p class="application-salary">💰 ${escapeHTML(
                              application.salary
                          )}</p>`
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
                                      <strong>${escapeHTML(
                                          closingStatus.label
                                      )}</strong>
                                      <span>Deadline: ${escapeHTML(
                                          application.closingDate
                                      )}</span>
                                  </div>
                              `;
                          })()
                        : ""
                }

                ${
                    application.jobUrl
                        ? `<p class="application-url">🔗 <a href="${escapeHTML(
                              application.jobUrl
                          )}" target="_blank" rel="noopener noreferrer">View Job Posting</a></p>`
                        : ""
                }

                ${
                    application.notes
                        ? `<p class="application-notes">📝 ${escapeHTML(
                              application.notes
                          )}</p>`
                        : ""
                }

                <div class="application-actions">
                    <button class="edit-btn" data-id="${application.id}">Edit</button>
                    <button class="delete-btn" data-id="${application.id}">Delete</button>
                </div>
            `;

            applicationsPageList.appendChild(card);
        });
    }

    if (searchApplications && statusFilter) {
        searchApplications.addEventListener(
            "input",
            renderApplications
        );

        statusFilter.addEventListener(
            "change",
            renderApplications
        );
    }

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

    function renderApplications() {
        document
            .querySelectorAll(".application-list")
            .forEach((list) => {
                list.innerHTML = "";
            });

        if (!searchApplications || !statusFilter) return;

        const searchTerm = searchApplications.value
            .toLowerCase()
            .trim();

        const selectedStatus = statusFilter.value;

        const filteredApplications =
            applications.filter((application) => {
                const company = String(
                    application?.company ?? ""
                ).toLowerCase();

                const role = String(
                    application?.role ?? ""
                ).toLowerCase();

                const location = String(
                    application?.location ?? ""
                ).toLowerCase();

                const matchesSearch =
                    company.includes(searchTerm) ||
                    role.includes(searchTerm) ||
                    location.includes(searchTerm);

                const matchesStatus =
                    selectedStatus === "All" ||
                    selectedStatus === "all" ||
                    application.status === selectedStatus;

                return matchesSearch && matchesStatus;
            });

        filteredApplications.forEach((application) => {
            const card = document.createElement("div");
            card.className = "application-card";
            card.draggable = true;
            card.dataset.id = String(
                application.id
            );

            const statusClass = String(
                application.status || ""
            )
                .toLowerCase()
                .replace(/\s+/g, "-");

            card.innerHTML = `
                <div class="application-card-header">
                    <h3>${escapeHTML(application.company || "")}</h3>
                    <span class="application-status status-${statusClass}">
                        ${escapeHTML(application.status || "")}
                    </span>
                </div>

                <p class="application-role">${escapeHTML(
                    application.role || ""
                )}</p>

                ${
                    application.location
                        ? `<p class="application-location">📍 ${escapeHTML(
                              application.location
                          )}</p>`
                        : ""
                }

                ${
                    application.applicationDate
                        ? `<p class="application-date">📅 ${escapeHTML(
                              application.applicationDate
                          )}</p>`
                        : ""
                }

                ${
                    application.salary
                        ? `<p class="application-salary">💰 ${escapeHTML(
                              application.salary
                          )}</p>`
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
                                      <strong>${escapeHTML(
                                          closingStatus.label
                                      )}</strong>
                                      <span>Deadline: ${escapeHTML(
                                          application.closingDate
                                      )}</span>
                                  </div>
                              `;
                          })()
                        : ""
                }

                ${
                    application.jobUrl
                        ? `<p class="application-url">🔗 <a href="${escapeHTML(
                              application.jobUrl
                          )}" target="_blank" rel="noopener noreferrer">View Job Posting</a></p>`
                        : ""
                }

                ${
                    application.notes
                        ? `<p class="application-notes">📝 ${escapeHTML(
                              application.notes
                          )}</p>`
                        : ""
                }

                <div class="application-actions">
                    <button class="edit-btn" data-id="${application.id}">Edit</button>
                    <button class="delete-btn" data-id="${application.id}">Delete</button>
                </div>
            `;

            card.addEventListener(
                "dragstart",
                (event) => {
                    card.classList.add("dragging");

                    event.dataTransfer.setData(
                        "text/plain",
                        String(application.id)
                    );

                    event.dataTransfer.effectAllowed =
                        "move";
                }
            );

            card.addEventListener(
                "dragend",
                () => {
                    card.classList.remove("dragging");
                }
            );

            const targetColumn = [...kanbanColumns].find(
                (column) => {
                    const columnTitle =
                        column.querySelector(
                            ".column-header span"
                        );

                    return (
                        columnTitle &&
                        columnTitle.textContent.trim() ===
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
        });

        updateColumnCounts();
    }

    function updateColumnCounts() {
        if (!kanbanColumns || !kanbanColumns.length)
            return;

        kanbanColumns.forEach((column) => {
            const columnTitle =
                column.querySelector(
                    ".column-header span"
                );

            const count =
                column.querySelector(".column-count");

            if (!columnTitle || !count) return;

            const status =
                columnTitle.textContent.trim();

            const number = applications.filter(
                (application) =>
                    application.status === status
            ).length;

            count.textContent = String(number);
        });
    }

    document
        .querySelectorAll(".kanban-column")
        .forEach((column) => {
            column.addEventListener(
                "dragover",
                (event) => {
                    event.preventDefault();

                    if (event.dataTransfer) {
                        event.dataTransfer.dropEffect =
                            "move";
                    }
                }
            );

            column.addEventListener(
                "drop",
                (event) => {
                    event.preventDefault();

                    const id = Number(
                        event.dataTransfer.getData(
                            "text/plain"
                        )
                    );

                    const application =
                        applications.find(
                            (app) => app.id === id
                        );

                    if (!application) return;

                    const columnTitle =
                        column.querySelector(
                            ".column-header span"
                        );

                    if (!columnTitle) return;

                    const newStatus =
                        columnTitle.textContent.trim();

                    application.status = newStatus;

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
        });

    function buildJobRecommendationHTML(message) {
        const matchedApplication =
            message?.matchedApplication;

        if (!matchedApplication) {
            return "";
        }

        return `
            <div class="ai-match">
                <span>Possible match</span>
                <strong>${escapeHTML(
                    matchedApplication.company
                )}</strong>
                <small>${escapeHTML(
                    matchedApplication.role
                )}</small>
            </div>
        `;
    }

    const cvFileInput =
        document.querySelector("#cv-file");

    const cvStatus =
        document.querySelector("#cv-status");

    const removeCVButton =
        document.querySelector("#remove-cv");

    const buildCVButton =
        document.querySelector("#build-cv-with-ai");

    const CV_DATABASE_NAME =
        "jobtselaCVDatabase";

    const CV_STORE_NAME =
        "cvFiles";

    const CV_RECORD_ID =
        "primary";

    const CV_DATABASE_VERSION =
        3;

    const MAX_CV_SIZE =
        5 * 1024 * 1024;

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const completeRead = (reader) => {
                reader.onload = () => {
                    if (
                        reader.result instanceof ArrayBuffer
                    ) {
                        resolve(reader.result);
                        return;
                    }

                    reject(
                        new Error(
                            "The CV could not be read as binary data."
                        )
                    );
                };

                reader.onerror = () => {
                    reject(
                        reader.error ||
                            new Error(
                                "The CV could not be read."
                            )
                    );
                };

                reader.onabort = () => {
                    reject(
                        new Error(
                            "CV file reading was cancelled."
                        )
                    );
                };
            };

            const reader =
                new FileReader();

            completeRead(reader);

            try {
                reader.readAsArrayBuffer(file);
            } catch (error) {
                reject(error);
            }
        });
    }

    function openCVDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(
                CV_DATABASE_NAME,
                CV_DATABASE_VERSION
            );

            request.onupgradeneeded = () => {
                const database =
                    request.result;

                if (
                    database.objectStoreNames.contains(
                        CV_STORE_NAME
                    )
                ) {
                    database.deleteObjectStore(
                        CV_STORE_NAME
                    );
                }

                database.createObjectStore(
                    CV_STORE_NAME,
                    {
                        keyPath: "id"
                    }
                );
            };

            request.onsuccess = () => {
                const database =
                    request.result;

                database.onversionchange = () => {
                    database.close();
                };

                resolve(database);
            };

            request.onerror = () => {
                reject(request.error);
            };

            request.onblocked = () => {
                reject(
                    new Error(
                        "The CV database is being used by another JobTsela tab. Close the other JobTsela tab and try again."
                    )
                );
            };
        });
    }

    async function saveCVFile(
        file,
        extractedText,
        fileData,
        extractionStatus = "ready"
    ) {
        const database =
            await openCVDatabase();

        return new Promise(
            (resolve, reject) => {
                const transaction =
                    database.transaction(
                        CV_STORE_NAME,
                        "readwrite"
                    );

                const store =
                    transaction.objectStore(
                        CV_STORE_NAME
                    );

                store.put({
                    id: CV_RECORD_ID,

                    name: file.name,

                    type:
                        file.type ||
                        (
                            file.name
                                .toLowerCase()
                                .endsWith(".pdf")
                                ? "application/pdf"
                                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        ),

                    size: file.size,

                    lastModified:
                        file.lastModified,

                    extractedText:
                        String(
                            extractedText || ""
                        ),

                    extractionStatus,

                    fileData
                });

                transaction.oncomplete = () => {
                    database.close();
                    resolve();
                };

                transaction.onerror = () => {
                    const error =
                        transaction.error;

                    database.close();

                    if (
                        error?.name ===
                        "QuotaExceededError"
                    ) {
                        reject(
                            new Error(
                                "There is not enough browser storage available to save this CV."
                            )
                        );
                        return;
                    }

                    reject(
                        error ||
                            new Error(
                                "The CV could not be saved."
                            )
                    );
                };

                transaction.onabort = () => {
                    const error =
                        transaction.error;

                    database.close();

                    reject(
                        error ||
                            new Error(
                                "The CV storage operation was aborted."
                            )
                    );
                };
            }
        );
    }

    async function extractPDFText(fileData) {
        const pdfjsLib =
            await import(
                "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.mjs"
            );

        pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.mjs";

        const pdfBytes =
            new Uint8Array(
                fileData.slice(0)
            );

        const loadingTask =
            pdfjsLib.getDocument({
                data: pdfBytes
            });

        const pdf =
            await loadingTask.promise;

        try {
            const pages = [];

            for (
                let pageNumber = 1;
                pageNumber <= pdf.numPages;
                pageNumber++
            ) {
                const page =
                    await pdf.getPage(
                        pageNumber
                    );

                const content =
                    await page.getTextContent();

                const pageText =
                    content.items
                        .map((item) => {
                            return typeof item.str ===
                                "string"
                                ? item.str
                                : "";
                        })
                        .join(" ")
                        .replace(/\s+/g, " ")
                        .trim();

                if (pageText) {
                    pages.push(pageText);
                }

                page.cleanup();
            }

            const extractedText =
                pages.join("\n\n").trim();

            if (!extractedText) {
                const error = new Error(
                    "This PDF appears to be scanned or image-based."
                );

                error.code =
                    "SCANNED_PDF";

                throw error;
            }

            return extractedText;
                } finally {

            if (
                pdf &&
                typeof pdf.destroy ===
                    "function"
            ) {
                await pdf.destroy();
            }

        }
    }

    async function extractDOCXText(
        fileData
    ) {
        if (!window.mammoth) {
            const error = new Error(
                "DOCX reader is unavailable."
            );

            error.code =
                "DOCX_READER_UNAVAILABLE";

            throw error;
        }

        const docxData =
            fileData.slice(0);

        const result =
            await window.mammoth.extractRawText(
                {
                    arrayBuffer: docxData
                }
            );

        if (result.messages?.length) {
            console.warn(
                "Mammoth DOCX extraction warnings:",
                result.messages
            );
        }

        const extractedText =
            String(result.value || "")
                .replace(/\s+/g, " ")
                .trim();

        if (!extractedText) {
            const error = new Error(
                "This DOCX does not contain readable text."
            );

            error.code =
                "EMPTY_DOCX";

            throw error;
        }

        return extractedText;
    }

    async function extractCVText(
        fileData,
        fileName
    ) {
        const lowerName =
            String(
                fileName || ""
            ).toLowerCase();

        if (
            lowerName.endsWith(".pdf")
        ) {
            return extractPDFText(
                fileData
            );
        }

        if (
            lowerName.endsWith(".docx")
        ) {
            return extractDOCXText(
                fileData
            );
        }

        const error = new Error(
            "Unsupported CV format."
        );

        error.code =
            "UNSUPPORTED_CV_FORMAT";

        throw error;
    }

    async function getStoredCV() {
        const database =
            await openCVDatabase();

        return new Promise(
            (resolve, reject) => {
                const transaction =
                    database.transaction(
                        CV_STORE_NAME,
                        "readonly"
                    );

                const store =
                    transaction.objectStore(
                        CV_STORE_NAME
                    );

                const request =
                    store.get(
                        CV_RECORD_ID
                    );

                request.onsuccess = () => {
                    database.close();

                    resolve(
                        request.result ||
                            null
                    );
                };

                request.onerror = () => {
                    database.close();

                    reject(
                        request.error
                    );
                };
            }
        );
    }

    async function deleteStoredCV() {
        const database =
            await openCVDatabase();

        return new Promise(
            (resolve, reject) => {
                const transaction =
                    database.transaction(
                        CV_STORE_NAME,
                        "readwrite"
                    );

                const store =
                    transaction.objectStore(
                        CV_STORE_NAME
                    );

                store.delete(
                    CV_RECORD_ID
                );

                transaction.oncomplete =
                    () => {
                        database.close();
                        resolve();
                    };

                transaction.onerror = () => {
                    const error =
                        transaction.error;

                    database.close();

                    reject(
                        error ||
                            new Error(
                                "The CV could not be removed."
                            )
                    );
                };

                transaction.onabort = () => {
                    const error =
                        transaction.error;

                    database.close();

                    reject(
                        error ||
                            new Error(
                                "CV removal was aborted."
                            )
                    );
                };
            }
        );
    }

    function formatFileSize(bytes) {
        if (
            bytes <
            1024 * 1024
        ) {
            return `${Math.round(
                bytes / 1024
            )} KB`;
        }

        return `${(
            bytes /
            (1024 * 1024)
        ).toFixed(1)} MB`;
    }

    function renderCVStatus(cv) {
        if (!cv) {
            if (cvStatus) {
                cvStatus.textContent =
                    "No CV uploaded yet.";
            }

            if (removeCVButton) {
                removeCVButton.disabled =
                    true;
            }

            if (buildCVButton) {
                buildCVButton.disabled =
                    true;
            }

            return;
        }

        const hasExtractedText =
            typeof cv.extractedText ===
                "string" &&
            cv.extractedText
                .trim()
                .length > 0;

        if (cvStatus) {
            if (hasExtractedText) {
                cvStatus.textContent =
                    `CV uploaded: ${cv.name} · ${formatFileSize(
                        cv.size
                    )} · Saved on this device`;
            } else if (
                cv.extractionStatus ===
                "scanned"
            ) {
                cvStatus.textContent =
                    `CV uploaded: ${cv.name} · ${formatFileSize(
                        cv.size
                    )} · Scanned PDF — OCR needed`;
            } else {
                cvStatus.textContent =
                    `CV uploaded: ${cv.name} · ${formatFileSize(
                        cv.size
                    )} · Text extraction pending`;
            }
        }

        if (removeCVButton) {
            removeCVButton.disabled =
                false;
        }

        if (buildCVButton) {
            buildCVButton.disabled =
                !hasExtractedText;
        }
    }

    async function handleCVUpload(file) {
        if (!file) return;

        const lowerName =
            String(
                file.name || ""
            ).toLowerCase();

        const isPDF =
            lowerName.endsWith(
                ".pdf"
            ) ||
            file.type ===
                "application/pdf";

        const isDOCX =
            lowerName.endsWith(
                ".docx"
            ) ||
            file.type ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        if (
            !isPDF &&
            !isDOCX
        ) {
            if (cvStatus) {
                cvStatus.textContent =
                    "Invalid file. Please upload a PDF or DOCX CV.";
            }

            if (cvFileInput) {
                cvFileInput.value =
                    "";
            }

            return;
        }

        if (file.size === 0) {
            if (cvStatus) {
                cvStatus.textContent =
                    "This file is empty. Please select a valid CV.";
            }

            if (cvFileInput) {
                cvFileInput.value =
                    "";
            }

            return;
        }

        if (
            file.size >
            MAX_CV_SIZE
        ) {
            if (cvStatus) {
                cvStatus.textContent =
                    "CV is too large. Maximum size is 5 MB.";
            }

            if (cvFileInput) {
                cvFileInput.value =
                    "";
            }

            return;
        }

        if (cvStatus) {
            cvStatus.textContent =
                "Uploading your CV...";
        }

        if (buildCVButton) {
            buildCVButton.disabled =
                true;
        }

        try {
            const fileData =
                await readFileAsArrayBuffer(
                    file
                );

            let extractedText =
                "";

            let extractionStatus =
                "ready";

            try {
                extractedText =
                    await extractCVText(
                        fileData,
                        file.name
                    );
                        } catch (error) {
                console.error(
                    "CV TEXT EXTRACTION FAILED:",
                    error
                );

                console.error(
                    "Extraction error name:",
                    error?.name
                );

                console.error(
                    "Extraction error message:",
                    error?.message
                );

                console.error(
                    "Extraction error code:",
                    error?.code
                );

                if (
                    error?.code ===
                    "SCANNED_PDF"
                ) {
                    extractionStatus =
                        "scanned";
                } else {
                    extractionStatus =
                        "pending";
                }
            }

            await saveCVFile(
                file,
                extractedText,
                fileData,
                extractionStatus
            );

            const storedCV =
                await getStoredCV();

            renderCVStatus(
                storedCV
            );

            if (
                cvStatus &&
                extractionStatus ===
                    "scanned"
            ) {
                cvStatus.textContent =
                    `CV uploaded: ${file.name} · ${formatFileSize(
                        file.size
                    )} · Scanned PDF — OCR needed`;
            } else if (
                cvStatus &&
                extractionStatus ===
                    "pending"
            ) {
                cvStatus.textContent =
                    `CV uploaded: ${file.name} · ${formatFileSize(
                        file.size
                    )} · Text extraction pending`;
            }
        } catch (error) {
            console.error(
                "Could not upload CV:",
                error
            );

            if (cvStatus) {
                if (
                    error?.name ===
                        "NotReadableError" ||
                    error?.code ===
                        "CV_FILE_NOT_READABLE"
                ) {
                    cvStatus.textContent =
                        "The CV could not be read. Close the file, make sure it is available locally, and select it again.";
                } else if (
                    error?.name ===
                    "QuotaExceededError"
                ) {
                    cvStatus.textContent =
                        "There is not enough browser storage available to save this CV.";
                } else {
                    cvStatus.textContent =
                        `Could not upload this CV: ${
                            error.message ||
                            "Unknown error"
                        }`;
                }
            }

            if (cvFileInput) {
                cvFileInput.value =
                    "";
            }

            if (buildCVButton) {
                buildCVButton.disabled =
                    true;
            }
        }
    }

    if (cvFileInput) {
        cvFileInput.addEventListener(
            "change",
            () => {
                const file =
                    cvFileInput.files?.[0];

                handleCVUpload(file);
            }
        );
    }

    if (removeCVButton) {
        removeCVButton.addEventListener(
            "click",
            async () => {
                try {
                    await deleteStoredCV();

                    if (cvFileInput) {
                        cvFileInput.value =
                            "";
                    }

                    renderCVStatus(
                        null
                    );
                } catch (error) {
                    console.error(
                        "Could not remove CV:",
                        error
                    );

                    if (cvStatus) {
                        cvStatus.textContent =
                            "Could not remove the saved CV. Please try again.";
                    }
                }
            }
        );
    }

    if (buildCVButton) {
        buildCVButton.addEventListener(
            "click",
            () => {
                alert(
                    "Your CV is ready for the AI CV Builder. The AI processing layer will be connected next."
                );
            }
        );
    }

    async function initializeCVProfile() {
        try {
            const storedCV =
                await getStoredCV();

            renderCVStatus(
                storedCV
            );
        } catch (error) {
            console.error(
                "Could not load stored CV:",
                error
            );
        }
    }

    function updateAIInbox() {
        const aiContent =
            document.querySelector(
                "#ai-content"
            );

        if (!aiContent) return;

        const categoryLabels = {
            INTERVIEW:
                "Interview Detected",
            ASSESSMENT:
                "Assessment Detected",
            OFFER:
                "Offer Detected",
            REJECTION:
                "Application Update",
            APPLICATION:
                "Application Received",
            RECRUITER:
                "Recruiter Activity",
            RECRUITMENT:
                "Career Opportunities",
            OTHER:
                "Other Gmail"
        };

        const categoryOrder = [
            "INTERVIEW",
            "ASSESSMENT",
            "OFFER",
            "REJECTION",
            "APPLICATION",
            "RECRUITER",
            "RECRUITMENT",
            "OTHER"
        ];

        const gmailMessages =
            (
                window.analysedGmailMessages ||
                []
            ).filter(
                (message) =>
                    message.category !==
                    "NOISE"
            );

        const groupedMessages =
            {};

        categoryOrder.forEach(
            (category) => {
                groupedMessages[
                    category
                ] = [];
            }
        );

        gmailMessages.forEach(
            (message) => {
                const category =
                    categoryOrder.includes(
                        message.category
                    )
                        ? message.category
                        : "OTHER";

                groupedMessages[
                    category
                ].push(message);
            }
        );

        const gmailSections = [];

        categoryOrder.forEach(
            (category) => {
                const messages =
                    groupedMessages[
                        category
                    ];

                if (
                    messages.length === 0
                )
                    return;

                const cards =
                    messages
                        .sort(
                            (a, b) => {
                                const dateA =
                                    new Date(
                                        a.date || 0
                                    );

                                const dateB =
                                    new Date(
                                        b.date || 0
                                    );

                                return (
                                    dateB -
                                    dateA
                                );
                            }
                        )
                        .map(
                            (
                                message
                            ) => {
                                const categoryClass =
                                    String(
                                        message.category ||
                                            ""
                                    )
                                        .toLowerCase()
                                        .replace(
                                            /\s+/g,
                                            "-"
                                        );

                                const matchHTML =
                                    buildJobRecommendationHTML(
                                        message
                                    );

                                const bodyPreview =
                                    String(
                                        message.body ||
                                            ""
                                    )
                                        .replace(
                                            /\s+/g,
                                            " "
                                        )
                                        .trim()
                                        .slice(
                                            0,
                                            160
                                        );

                                const previewHTML =
                                    bodyPreview
                                        ? `<p>${escapeHTML(
                                              bodyPreview
                                          )}${
                                              String(
                                                  message.body ||
                                                      ""
                                              )
                                                  .length >
                                              160
                                                  ? "..."
                                                  : ""
                                          }</p>`
                                        : "";

                                return `
                        <div class="ai-recommendation gmail-recommendation ${categoryClass}">
                            <div class="ai-card-main">
                                <strong>${escapeHTML(
                                    message.subject ||
                                        "(No subject)"
                                )}</strong>
                                <small>${escapeHTML(
                                    message.sender ||
                                        "Unknown sender"
                                )}</small>
                                ${previewHTML}
                            </div>

                            <span class="ai-category-badge">
                                ${escapeHTML(
                                    categoryLabels[
                                        category
                                    ]
                                )}
                            </span>

                            ${matchHTML}
                        </div>
                    `;
                            }
                        )
                        .join("");

                gmailSections.push(
                    `
                <section class="ai-category-section" data-category="${escapeHTML(
                    category
                )}">
                    <div class="ai-category-header">
                        <h3>${escapeHTML(
                            categoryLabels[
                                category
                            ]
                        )}</h3>
                        <span>${messages.length}</span>
                    </div>

                    <div class="ai-category-messages">
                        ${cards}
                    </div>
                </section>
            `
                );
            }
        );

        const applicationRecommendations =
            applications
                .filter(
                    (application) =>
                        application.status !==
                        "Offer"
                )
                .map(
                    (application) => {
                        return `
                    <div class="ai-recommendation application-recommendation">
                        <div class="ai-card-main">
                            <strong>${escapeHTML(
                                application.company
                            )}</strong>
                            <small>${escapeHTML(
                                application.role
                            )}</small>
                        </div>

                        <span class="ai-category-badge">
                            ${escapeHTML(
                                application.status
                            )}
                        </span>
                    </div>
                `;
                    }
                )
                .join("");

        const applicationSection =
            applicationRecommendations
                ? `
                <section class="ai-category-section" data-category="APPLICATION-PIPELINE">
                    <div class="ai-category-header">
                        <h3>Application Pipeline</h3>
                        <span>${applications.filter(
                            (application) =>
                                application.status !==
                                "Offer"
                        ).length}</span>
                    </div>

                    <div class="ai-category-messages">
                        ${applicationRecommendations}
                    </div>
                </section>
            `
                : "";

        if (
            gmailSections.length === 0 &&
            !applicationSection
        ) {
            aiContent.innerHTML = `
                <div class="ai-empty">
                    <h3>No recruitment alerts right now.</h3>
                    <p>JobTsela will continue monitoring your application pipeline and Gmail.</p>
                </div>
            `;

            return;
        }

        aiContent.innerHTML = `
            ${gmailSections.join("")}
            ${applicationSection}
        `;
    }

    const modal =
        document.querySelector(
            "#dashboard-application-modal"
        );

    const openModalButton =
        document.querySelector(
            "#dashboard-open-modal"
        );

    const closeModalButton =
        document.querySelector(
            "#dashboard-close-modal"
        );

    const cancelModalButton =
        document.querySelector(
            "#dashboard-cancel-modal"
        );

    const applicationForm =
        document.querySelector(
            "#dashboard-application-form"
        );

    const hasApplicationModal =
        !!(
            modal &&
            openModalButton &&
            closeModalButton &&
            cancelModalButton &&
            applicationForm
        );

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
                        "#dashboard-submit-application"
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

        closeModalButton.addEventListener(
            "click",
            () => {
                modal.classList.remove(
                    "active"
                );
            }
        );

        cancelModalButton.addEventListener(
            "click",
            () => {
                modal.classList.remove(
                    "active"
                );
            }
        );

        modal.addEventListener(
            "click",
            (event) => {
                if (
                    event.target === modal
                ) {
                    modal.classList.remove(
                        "active"
                    );
                }
            }
        );

        applicationForm.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();

                const companyField =
                    document.querySelector(
                        "#company"
                    );

                const roleField =
                    document.querySelector(
                        "#role"
                    );

                const locationField =
                    document.querySelector(
                        "#location"
                    );

                const statusField =
                    document.querySelector(
                        "#status"
                    );

                const applicationDateField =
                    document.querySelector(
                        "#application-date"
                    );

                const interviewDateField =
                    document.querySelector(
                        "#interview-date"
                    );

                const interviewTimeField =
                    document.querySelector(
                        "#interview-time"
                    );

                const salaryField =
                    document.querySelector(
                        "#salary"
                    );

                const closingDateField =
                    document.querySelector(
                        "#closing-date"
                    );

                const jobUrlField =
                    document.querySelector(
                        "#job-url"
                    );

                const notesField =
                    document.querySelector(
                        "#notes"
                    );

                if (
                    !companyField ||
                    !roleField ||
                    !statusField
                ) {
                    console.error(
                        "Required application fields are missing."
                    );
                    return;
                }

                const company =
                    companyField.value.trim();

                const role =
                    roleField.value.trim();

                const location =
                    locationField
                        ? locationField.value.trim()
                        : "";

                const status =
                    statusField.value;

                const applicationDate =
                    applicationDateField
                        ? applicationDateField.value
                        : "";

                const interviewDate =
                    interviewDateField
                        ? interviewDateField.value
                        : "";

                const interviewTime =
                    interviewTimeField
                        ? interviewTimeField.value
                        : "";

                const salary =
                    salaryField
                        ? salaryField.value.trim()
                        : "";

                const closingDate =
                    closingDateField
                        ? closingDateField.value
                        : "";

                const jobUrl =
                    jobUrlField
                        ? jobUrlField.value.trim()
                        : "";

                const notes =
                    notesField
                        ? notesField.value.trim()
                        : "";

                if (
                    editingApplicationId !==
                    null
                ) {
                    const application =
                        applications.find(
                            (item) =>
                                item.id ===
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
                    applications.push(
                        {
                            id: Date.now(),
                            company,
                            role,
                            location,
                            status,
                            applicationDate,
                            interviewDate,
                            interviewTime,
                            salary,
                            closingDate,
                            jobUrl,
                            notes
                        }
                    );
                }

                saveApplications();

                if (
                    document.querySelector(
                        ".kanban-column"
                    )
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

                applicationForm.reset();
                editingApplicationId =
                    null;

                const modalTitle =
                    document.querySelector(
                        ".modal-header h2"
                    );

                const submitButton =
                    document.querySelector(
                        "#dashboard-submit-application"
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

    document.addEventListener(
        "click",
        (event) => {
            const target =
                event.target;

            if (
                !(target instanceof Element)
            )
                return;

            if (
                target.classList.contains(
                    "delete-btn"
                )
            ) {
                const applicationId =
                    Number(
                        target.dataset.id
                    );

                const confirmDelete =
                    confirm(
                        "Are you sure you want to delete this application?"
                    );

                if (!confirmDelete)
                    return;

                applications =
                    applications.filter(
                        (application) =>
                            application.id !==
                            applicationId
                    );

                saveApplications();

                if (
                    document.querySelector(
                        ".kanban-column"
                    )
                ) {
                    updateStatistics();
                    renderApplications();
                    updateColumnCounts();
                }

                renderApplicationsPage();
                updateAIInbox();
                renderInterviewsPage();
                renderAnalyticsPage();
            }

            if (
                target.classList.contains(
                    "edit-btn"
                )
            ) {
                const applicationId =
                    Number(
                        target.dataset.id
                    );

                const application =
                    applications.find(
                        (item) =>
                            item.id ===
                            applicationId
                    );

                if (
                    !application ||
                    !hasApplicationModal
                )
                    return;

                editingApplicationId =
                    applicationId;

                const company =
                    document.querySelector(
                        "#company"
                    );

                const role =
                    document.querySelector(
                        "#role"
                    );

                const location =
                    document.querySelector(
                        "#location"
                    );

                const status =
                    document.querySelector(
                        "#status"
                    );

                const applicationDate =
                    document.querySelector(
                        "#application-date"
                    );

                const interviewDate =
                    document.querySelector(
                        "#interview-date"
                    );

                const interviewTime =
                    document.querySelector(
                        "#interview-time"
                    );

                const salary =
                    document.querySelector(
                        "#salary"
                    );

                const closingDate =
                    document.querySelector(
                        "#closing-date"
                    );

                const jobUrl =
                    document.querySelector(
                        "#job-url"
                    );

                const notes =
                    document.querySelector(
                        "#notes"
                    );

                if (company)
                    company.value =
                        application.company ||
                        "";

                if (role)
                    role.value =
                        application.role ||
                        "";

                if (location)
                    location.value =
                        application.location ||
                        "";

                if (status)
                    status.value =
                        application.status ||
                        "Applied";

                if (applicationDate)
                    applicationDate.value =
                        application.applicationDate ||
                        "";

                if (interviewDate)
                    interviewDate.value =
                        application.interviewDate ||
                        "";

                if (interviewTime)
                    interviewTime.value =
                        application.interviewTime ||
                        "";

                if (salary)
                    salary.value =
                        application.salary ||
                        "";

                if (closingDate)
                    closingDate.value =
                        application.closingDate ||
                        "";

                if (jobUrl)
                    jobUrl.value =
                        application.jobUrl ||
                        "";

                if (notes)
                    notes.value =
                        application.notes ||
                        "";

                const modalTitle =
                    document.querySelector(
                        ".modal-header h2"
                    );

                const submitButton =
                    document.querySelector(
                        "#dashboard-submit-application"
                    );

                if (modalTitle)
                    modalTitle.textContent =
                        "Edit Job Application";

                if (submitButton)
                    submitButton.textContent =
                        "Save Changes";

                modal.classList.add(
                    "active"
                );
            }
        }
    );

    function renderInterviewsPage() {
        const interviewsList =
            document.querySelector(
                "#interviewsList"
            );

        if (!interviewsList) return;

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

        const now =
            new Date();

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );

        const interviews =
            applications
                .filter(
                    (application) =>
                        application.status ===
                            "Interview" &&
                        application.interviewDate
                )
                .map(
                    (application) => {
                        const dateTime =
                            new Date(
                                `${application.interviewDate}T${
                                    application.interviewTime ||
                                    "23:59"
                                }`
                            );

                        return {
                            application,
                            dateTime
                        };
                    }
                )
                .sort(
                    (a, b) =>
                        a.dateTime -
                        b.dateTime
                );

        const upcoming =
            interviews.filter(
                (interview) =>
                    interview.dateTime >=
                    now
            );

        const todayInterviews =
            interviews.filter(
                (interview) => {
                    const interviewDay =
                        new Date(
                            `${interview.application.interviewDate}T00:00:00`
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
                (interview) =>
                    interview.dateTime <
                    now
            );

        if (totalElement)
            totalElement.textContent =
                String(
                    interviews.length
                );

        if (upcomingElement)
            upcomingElement.textContent =
                String(
                    upcoming.length
                );

        if (todayElement)
            todayElement.textContent =
                String(
                    todayInterviews.length
                );

        if (completedElement)
            completedElement.textContent =
                String(
                    completed.length
                );

        if (
            interviews.length ===
            0
        ) {
            interviewsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">+</div>
                    <h3>No interviews scheduled</h3>
                    <p>Add an interview date and time to an application to see it here.</p>
                </div>
            `;

            return;
        }

        interviewsList.innerHTML =
            "";

        interviews.forEach(
            ({
                application,
                dateTime
            }) => {
                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "interview-card";

                const date =
                    dateTime.toLocaleDateString(
                        undefined,
                        {
                            weekday:
                                "long",
                            day:
                                "numeric",
                            month:
                                "long",
                            year:
                                "numeric"
                        }
                    );

                const time =
                    application.interviewTime
                        ? dateTime.toLocaleTimeString(
                              undefined,
                              {
                                  hour:
                                      "numeric",
                                  minute:
                                      "2-digit"
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
                        <h3>${escapeHTML(
                            application.company
                        )}</h3>
                        <p>${escapeHTML(
                            application.role
                        )}</p>
                    </div>
                    <span>${completedLabel}</span>
                </div>

                <div class="interview-details">
                    <p>📅 ${escapeHTML(
                        date
                    )}</p>
                    <p>🕒 ${escapeHTML(
                        time
                    )}</p>
                    ${
                        application.location
                            ? `<p>📍 ${escapeHTML(
                                  application.location
                              )}</p>`
                            : ""
                    }
                </div>
            `;

                interviewsList.appendChild(
                    card
                );
            }
        );
    }

    function renderAnalyticsPage() {
        const breakdown =
            document.querySelector(
                "#analytics-breakdown"
            );

        if (!breakdown) return;

        const total =
            applications.length;

        const applied =
            applications.filter(
                (application) =>
                    application.status ===
                    "Applied"
            ).length;

        const assessment =
            applications.filter(
                (application) =>
                    application.status ===
                    "Assessment"
            ).length;

        const interviews =
            applications.filter(
                (application) =>
                    application.status ===
                    "Interview"
            ).length;

        const offers =
            applications.filter(
                (application) =>
                    application.status ===
                    "Offer"
            ).length;

        const rejected =
            applications.filter(
                (application) =>
                    application.status ===
                    "Rejected"
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

        const responseRatePct =
            total > 0
                ? Math.round(
                      (responses /
                          total) *
                          100
                  )
                : 0;

        const interviewRatePct =
            total > 0
                ? Math.round(
                      (interviews /
                          total) *
                          100
                  )
                : 0;

        const offerRatePct =
            total > 0
                ? Math.round(
                      (offers /
                          total) *
                          100
                  )
                : 0;

        const analyticsTotal =
            document.querySelector(
                "#analytics-total"
            );

        const analyticsActive =
            document.querySelector(
                "#analytics-active"
            );

        const analyticsInterviews =
            document.querySelector(
                "#analytics-interviews"
            );

        const analyticsOffers =
            document.querySelector(
                "#analytics-offers"
            );

        const analyticsResponseRate =
            document.querySelector(
                "#analytics-response-rate"
            );

        const analyticsInterviewRate =
            document.querySelector(
                "#analytics-interview-rate"
            );

        const analyticsOfferRate =
            document.querySelector(
                "#analytics-offer-rate"
            );

        if (analyticsTotal)
            analyticsTotal.textContent =
                String(total);

        if (analyticsActive)
            analyticsActive.textContent =
                String(active);

        if (analyticsInterviews)
            analyticsInterviews.textContent =
                String(interviews);

        if (analyticsOffers)
            analyticsOffers.textContent =
                String(offers);

        if (analyticsResponseRate)
            analyticsResponseRate.textContent =
                `${responseRatePct}%`;

        if (analyticsInterviewRate)
            analyticsInterviewRate.textContent =
                `${interviewRatePct}%`;

        if (analyticsOfferRate)
            analyticsOfferRate.textContent =
                `${offerRatePct}%`;

        if (total === 0) {
            breakdown.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">+</div>
                    <h3>No analytics yet</h3>
                    <p>Add applications to start generating career insights.</p>
                </div>
            `;

            return;
        }

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
                ${stages
                    .map((stage) => {
                        const percentage =
                            (stage.count /
                                total) *
                            100;

                        return `
                        <div class="analytics-row">
                            <div class="analytics-label">${escapeHTML(
                                stage.label
                            )}</div>
                            <div class="analytics-bar">
                                <div class="analytics-bar-fill" style="width: ${percentage}%"></div>
                            </div>
                            <div class="analytics-count">${stage.count}</div>
                        </div>
                    `;
                    })
                    .join("")}
            </div>
        `;
    }

    function initializeApp() {
        const hasKanban =
            !!document.querySelector(
                ".kanban-column"
            );

        const hasApplicationsPage =
            !!document.querySelector(
                "#applicationsList"
            );

        const hasInterviewsPage =
            !!document.querySelector(
                "#interviewsList"
            );

        const hasUpcomingInterviews =
            !!document.querySelector(
                "#upcoming-interviews"
            );

        const hasAnalyticsPage =
            !!document.querySelector(
                "#analytics-breakdown"
            );

        const hasAIInbox =
            !!document.querySelector(
                "#ai-content"
            );

        if (hasKanban) {
            updateStatistics();
            renderApplications();
            updateColumnCounts();
        }

        if (hasApplicationsPage) {
            renderApplicationsPage();
        }

        if (hasAIInbox) {
            updateAIInbox();
        }

        if (hasUpcomingInterviews) {
            updateUpcomingInterviews();
        }

        if (hasInterviewsPage) {
            renderInterviewsPage();
        }

        if (hasAnalyticsPage) {
            renderAnalyticsPage();
        }

        updateGreeting();
        initializeCVProfile();
    }

    const connectGmailButton =
        document.querySelector(
            "#connect-gmail"
        );

    if (connectGmailButton) {
        connectGmailButton.addEventListener(
            "click",
            connectGmail
        );
    }

    initializeApp();

    console.log(
        "JobTsela JavaScript loaded successfully."
    );
})();