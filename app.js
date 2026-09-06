// ========================================
// TUTOR MANAGER V3
// Complete app.js
// ========================================
// ========================================
// SUPABASE CONFIG
// ========================================
// Replace these with your Supabase project values.
const SUPABASE_URL =
    "https://gbvcepsqigpwxphxdqav.supabase.co";

const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidmNlcHNxaWdwd3hwaHhkcWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTUzNzUsImV4cCI6MjEwNDE5MTM3NX0.Pt2K0bKYD7Y1cldssICjIu9DeeYOk-X0bg_xwCbk7sQ";
// ========================================
// SUPABASE CLIENT
// ========================================
const { createClient } = window.supabase;
const sb = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
// ========================================
// APP STATE
// ========================================
let state = {
    user: null,
    profile: null,
    students: [],
    lessons: [],
    payments: [],
    page: "home"
};
// ========================================
// BASIC HELPERS
// ========================================
function $(selector) {
    return document.querySelector(selector);
}
function escapeHTML(value) {
    return String(value ?? "")
        .replace(
            /[&<>"']/g,
            character => {
                const map = {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                };
                return map[character];
            }
        );
}
function money(amount) {
    return "$" +
        Number(amount || 0)
            .toLocaleString(
                "en-HK",
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }
            );
}
function today() {
    return new Date()
        .toISOString()
        .slice(0, 10);
}
function getStudent(id) {
    return state.students.find(
        student =>
            String(student.id) === String(id)
    );
}
function getLesson(id) {
    return state.lessons.find(
        lesson =>
            String(lesson.id) === String(id)
    );
}
function timeToMinutes(time) {
    if (!time) {
        return 0;
    }
    const parts =
        String(time)
            .slice(0, 5)
            .split(":")
            .map(Number);
    return (
        (parts[0] || 0) * 60 +
        (parts[1] || 0)
    );
}
function lessonHours(lesson) {
    const start =
        timeToMinutes(
            lesson.start_time
        );
    const end =
        timeToMinutes(
            lesson.end_time
        );
    return Math.max(
        0,
        (end - start) / 60
    );
}
function lessonFee(lesson) {
    return (
        lessonHours(lesson) *
        Number(
            lesson.hourly_rate || 0
        )
    );
}
function formatDate(date) {
    if (!date) {
        return "";
    }
    return new Date(
        date + "T00:00:00"
    ).toLocaleDateString(
        "en-GB",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}
function formatTime(time) {
    if (!time) {
        return "";
    }
    return new Date(
        "2000-01-01T" +
        String(time).slice(0, 5)
    ).toLocaleTimeString(
        "en-US",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}
function closeModal() {
    document
        .querySelector(".modal")
        ?.remove();
}
// ========================================
// INITIALISE
// ========================================
async function init() {
    try {
        const {
            data,
            error
        } = await sb.auth.getSession();
        if (error) {
            console.error(error);
            renderLogin();
            return;
        }
        const session =
            data.session;
        if (session) {
            await loadUser(
                session.user
            );
        } else {
            renderLogin();
        }
        sb.auth.onAuthStateChange(
            async (
                event,
                session
            ) => {
                if (session) {
                    await loadUser(
                        session.user
                    );
                } else {
                    state.user = null;
                    state.profile = null;
                    renderLogin();
                }
            }
        );
    } catch (error) {
        console.error(error);
        renderError(
            "Unable to start Tutor Manager.",
            error.message
        );
    }
}
// ========================================
// LOAD USER
// ========================================
async function loadUser(user) {
    state.user = user;
    const {
        data,
        error
    } = await sb
        .from("profiles")
        .select("*")
        .eq(
            "id",
            user.id
        )
        .single();
    if (error) {
        console.error(error);
        renderError(
            "Could not load your profile.",
            error.message
        );
        return;
    }
    state.profile = data;
    await refreshData();
}
// ========================================
// LOAD DATA
// ========================================
async function refreshData() {
    if (
        !state.user ||
        !state.profile
    ) {
        return;
    }
    try {
        if (
            state.profile.role === "tutor"
        ) {
            const [
                studentsResult,
                lessonsResult,
                paymentsResult
            ] = await Promise.all([
                sb
                    .from("students")
                    .select("*")
                    .eq(
                        "tutor_id",
                        state.user.id
                    )
                    .order(
                        "name",
                        {
                            ascending: true
                        }
                    ),
                sb
                    .from("lessons")
                    .select("*")
                    .eq(
                        "tutor_id",
                        state.user.id
                    )
                    .order(
                        "lesson_date",
                        {
                            ascending: false
                        }
                    )
                    .order(
                        "start_time",
                        {
                            ascending: true
                        }
                    ),
                sb
                    .from("payments")
                    .select("*")
                    .eq(
                        "tutor_id",
                        state.user.id
                    )
                    .order(
                        "payment_date",
                        {
                            ascending: false
                        })
            ]);
            if (studentsResult.error) {
                throw studentsResult.error;
            }
            if (lessonsResult.error) {
                throw lessonsResult.error;
            }
            if (paymentsResult.error) {
                throw paymentsResult.error;
            }
            state.students =
                studentsResult.data || [];
            state.lessons =
                lessonsResult.data || [];
            state.payments =
                paymentsResult.data || [];
        } else {
            const [
                studentsResult,
                lessonsResult,
                paymentsResult
            ] = await Promise.all([
                sb
                    .from("students")
                    .select("*")
                    .eq(
                        "parent_user_id",
                        state.user.id
                    )
                    .order(
                        "name",
                        {
                            ascending: true
                        }
                    ),
                sb
                    .from("lessons")
                    .select("*")
                    .eq(
                        "shared_with_parent",
                        true
                    )
                    .order(
                        "lesson_date",
                        {
                            ascending: false
                        }
                    )
                    .order(
                        "start_time",
                        {
                            ascending: true
                        }
                    ),
                sb
                    .from("payments")
                    .select("*")
                    .order(
                        "payment_date",
                        {
                            ascending: false
                        })
            ]);
            if (studentsResult.error) {
                throw studentsResult.error;
            }
            if (lessonsResult.error) {
                throw lessonsResult.error;
            }
            state.students =
                studentsResult.data || [];
            state.lessons =
                lessonsResult.data || [];
            state.payments =
                paymentsResult.data || [];
        }
        render();
    } catch (error) {
        console.error(error);
        renderError(
            "Unable to load your data.",
            error.message
        );
    }
}
// ========================================
// LOGIN SCREEN
// ========================================
function renderLogin() {
    document.body.innerHTML = `
        <div class="auth">
            <div class="authbox">
                <h1>
                    Tutor Manager
                </h1>
                <p
                    class="muted"
                    style="margin-top:6px"
                >
                    Tutor + Parent Portal
                </p>
                <div class="field">
                    <label>
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        autocomplete="email"
                    >
                </div>
                <div class="field">
                    <label>
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        placeholder="Password"
                        autocomplete="current-password"
                    >
                </div>
                <div
                    class="field"
                    style="margin-top:18px"
                >
                    <label>
                        Account type
                    </label>
                    <select id="role">
                        <option value="tutor">
                            Tutor
                        </option>
                        <option value="parent">
                            Parent
                        </option>
                    </select>
                </div>
                <div class="actions">
                    <button
                        class="btn primary"
                        onclick="login()"
                    >
                        Log in
                    </button>
                    <button
                        class="btn secondary"
                        onclick="signup()"
                    >
                        Create account
                    </button>
                </div>
            </div>
        </div>
    `;
}
// ========================================
// LOGIN
// ========================================
async function login() {
    const email =
        $("#email")
            ?.value
            .trim();
    const password =
        $("#password")
            ?.value;
    if (!email || !password) {
        alert(
            "Please enter your email and password."
        );
        return;
    }
    const {
        error
    } = await sb.auth.signInWithPassword({
        email,
        password
    });
    if (error) {
        alert(
            error.message
        );
    }
}
// ========================================
// SIGN UP
// ========================================
async function signup() {
    const email =
        $("#email")
            ?.value
            .trim();
    const password =
        $("#password")
            ?.value;
    const role =
        $("#role")
            ?.value || "tutor";
    if (!email || !password) {
        alert(
            "Please enter your email and password."
        );
        return;
    }
    if (password.length < 6) {
        alert(
            "Password must be at least 6 characters."
        );
        return;
    }
    const {
        data,
        error
    } = await sb.auth.signUp({
        email,
        password,
        options: {
            data: {
                role,
                full_name:
                    email.split("@")[0]
            }
        }
    });
    if (error) {
        alert(
            error.message
        );
        return;
    }
    if (
        data.session
    ) {
        alert(
            "Account created successfully."
        );
    } else {
        alert(
            "Account created. " +
            "Please check your email if confirmation is enabled."
        );
    }
}
// ========================================
// LOGOUT
// ========================================
async function logout() {
    await sb.auth.signOut();
}
// ========================================
// ERROR SCREEN
// ========================================
function renderError(
    title,
    message
) {
    document.body.innerHTML = `
        <div class="auth">
            <div class="authbox">
                <h1>
                    ${escapeHTML(title)}
                </h1>
                <p
                    class="muted"
                    style="margin-top:10px"
                >
                    ${escapeHTML(message || "")}
                </p>
                <button
                    class="btn primary"
                    style="margin-top:20px"
                    onclick="location.reload()"
                >
                    Reload
                </button>
            </div>
        </div>
    `;
}
// ========================================
// MAIN APP
// ========================================
function render() {
    if (
        !state.user ||
        !state.profile
    ) {
        renderLogin();
        return;
    }
    document.body.innerHTML = `
        <header class="top">
            <div>
                <h1>
                    Tutor Manager
                </h1>
                <p class="muted small">
                    ${escapeHTML(
                        state.profile.full_name ||
                        state.user.email
                    )}
                    ·
                    ${escapeHTML(
                        state.profile.role
                    )}
                </p>
            </div>
            <button
                class="btn secondary"
                onclick="logout()"
            >
                Log out
            </button>
        </header>
        <div id="content"></div>
        <nav class="nav">
            ${navigationButton(
                "home",
                "🏠",
                "Home"
            )}
            ${navigationButton(
                "calendar",
                "📅",
                "Calendar"
            )}
            ${navigationButton(
                "students",
                "👨‍🎓",
                "Students"
            )}
            ${navigationButton(
                "money",
                "💰",
                "Money"
            )}
            ${navigationButton(
                "account",
                "⚙️",
                "Account"
            )}
        </nav>
    `;
    showPage(
        state.page
    );
}
// ========================================
// NAVIGATION BUTTON
// ========================================
function navigationButton(
    page,
    icon,
    label
) {
    return `
        <button
            class="${
                state.page === page
                    ? "active"
                    : ""
            }"
            onclick="
                showPage('${page}')
            "
        >
            ${icon}
            <br>
            ${label}
        </button>
    `;
}
// ========================================
// PAGE NAVIGATION
// ========================================
function showPage(page) {
    state.page = page;
    const content =
        $("#content");
    if (!content) {
        return;
    }
    switch (page) {
        case "home":
            renderHome(content);
            break;
        case "calendar":
            renderCalendar(content);
            break;
        case "students":
            renderStudents(content);
            break;
        case "money":
            renderMoney(content);
            break;
        case "account":
            renderAccount(content);
            break;
        default:
            renderHome(content);
    }
    document
        .querySelectorAll(
            ".nav button"
        )
        .forEach(button => {
            button.classList.remove(
                "active"
            );
        });
    const pages = [
        "home",
        "calendar",
        "students",
        "money",
        "account"
    ];
    const index =
        pages.indexOf(page);
    const buttons = [
        ...document.querySelectorAll(
            ".nav button"
        )
    ];
    if (index >= 0) {
        buttons[index]
            ?.classList.add(
                "active"
            );
    }
}
// ========================================
// HOME
// ========================================
function renderHome(content) {
    const currentMonth =
        today().slice(0, 7);
    const monthLessons =
        state.lessons.filter(
            lesson =>
                String(
                    lesson.lesson_date
                )
                .startsWith(
                    currentMonth
                )
                &&
                lesson.status !==
                    "cancelled"
        );
    const income =
        monthLessons
            .filter(
                lesson =>
                    lesson.payment_status ===
                    "paid"
            )
            .reduce(
                (
                    total,
                    lesson
                ) =>
                    total +
                    lessonFee(lesson),
                0
            );
    const outstanding =
        monthLessons
            .filter(
                lesson =>
                    lesson.payment_status ===
                    "unpaid"
            )
            .reduce(
                (
                    total,
                    lesson
                ) =>
                    total +
                    lessonFee(lesson),
                0
            );
    const totalHours =
        monthLessons.reduce(
            (
                total,
                lesson
            ) =>
                total +
                lessonHours(lesson),
            0
        );
    const todayLessons =
        state.lessons
            .filter(
                lesson =>
                    lesson.lesson_date ===
                        today()
                    &&
                    lesson.status !==
                        "cancelled"
                    &&
                    (
                        state.profile.role ===
                            "tutor"
                        ||
                        lesson.shared_with_parent
                    )
            );
    const upcomingLessons =
        state.lessons
            .filter(
                lesson =>
                    lesson.lesson_date >
                        today()
                    &&
                    lesson.status !==
                        "cancelled"
                    &&
                    (
                        state.profile.role ===
                            "tutor"
                        ||
                        lesson.shared_with_parent
                    )
            )
            .slice(
                0,
                5
            );
    content.innerHTML = `
        <main>
            <h2>
                ${
                    state.profile.role ===
                    "tutor"
                        ? "Dashboard"
                        : "Parent Portal"
                }
            </h2>
            <p
                class="muted small"
                style="margin-top:5px"
            >
                ${new Date()
                    .toLocaleDateString(
                        "en-GB",
                        {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                        }
                    )}
            </p>
            <div
                class="grid"
                style="padding:15px 0"
            >
                ${statCard(
                    "Students",
                    state.students.length
                )}
                ${statCard(
                    "Income",
                    money(income)
                )}
                ${statCard(
                    "Hours",
                    totalHours.toFixed(1)
                )}
                ${statCard(
                    "Outstanding",
                    money(outstanding)
                )}
            </div>
            <div class="row">
                <h3>
                    ${
                        state.profile.role ===
                        "tutor"
                            ? "Today's classes"
                            : "Today's shared lessons"
                    }
                </h3>
                ${
                    state.profile.role ===
                    "tutor"
                        ? `
                            <button
                                class="btn primary"
                                onclick="lessonForm()"
                            >
                                + Lesson
                            </button>
                          `
                        : ""
                }
            </div>
            ${
                todayLessons
                    .map(
                        lessonCard
                    )
                    .join("")
                ||
                `
                    <div class="empty">
                        No classes today.
                    </div>
                `
            }
            <h3
                style="margin-top:25px"
            >
                Upcoming
            </h3>
            ${
                upcomingLessons
                    .map(
                        lessonCard
                    )
                    .join("")
                ||
                `
                    <div class="empty">
                        No upcoming lessons.
                    </div>
                `
            }
        </main>
    `;
}
// ========================================
// STAT CARD
// ========================================
function statCard(
    title,
    value
) {
    return `
        <div class="stat">
            <span class="muted small">
                ${escapeHTML(title)}
            </span>
            <b>
                ${value}
            </b>
        </div>
    `;
}
// ========================================
// LESSON CARD
// ========================================
function lessonCard(lesson) {
    const student =
        getStudent(
            lesson.student_id
        );
    if (!student) {
        return "";
    }
    if (
        state.profile.role ===
            "parent"
        &&
        !lesson.shared_with_parent
    ) {
        return "";
    }
    const statusClass =
        lesson.payment_status ===
            "paid"
            ? "paid"
            : "unpaid";
    return `
        <div class="card">
            <div class="row">
                <div>
                    <b>
                        ${escapeHTML(
                            student.name
                        )}
                    </b>
                    <div class="muted small">
                        ${escapeHTML(
                            student.subject ||
                            "Tutoring"
                        )}
                        ·
                        ${formatDate(
                            lesson.lesson_date
                        )}
                        ·
                        ${formatTime(
                            lesson.start_time
                        )}
                        –
                        ${formatTime(
                            lesson.end_time
                        )}
                    </div>
                </div>
                <div
                    style="text-align:right"
                >
                    <b>
                        ${money(
                            lessonFee(lesson)
                        )}
                    </b>
                    <br>
                    <span
                        class="badge ${statusClass}"
                    >
                        ${escapeHTML(
                            lesson.payment_status ||
                            "unpaid"
                        )}
                    </span>
                </div>
            </div>
            ${
                lesson.lesson_summary
                    ? `
                        <p
                            class="small"
                            style="margin-top:10px"
                        >
                            <b>
                                Lesson:
                            </b>
                            ${escapeHTML(
                                lesson.lesson_summary
                            )}
                        </p>
                      `
                    : ""
            }
            ${
                lesson.homework
                    ? `
                        <p
                            class="small"
                            style="margin-top:6px"
                        >
                            <b>
                                Homework:
                            </b>
                            ${escapeHTML(
                                lesson.homework
                            )}
                        </p>
                      `
                    : ""
            }
            ${
                state.profile.role ===
                "tutor"
                    ? `
                        <div
                            class="actions"
                            style="margin-top:10px"
                        >
                            <button
                                class="btn secondary"
                                onclick="
                                    editLesson(
                                        '${lesson.id}'
                                    )
                                "
                            >
                                Edit
                            </button>
                            ${
                                lesson.payment_status !==
                                "paid"
                                    ? `
                                        <button
                                            class="btn secondary"
                                            onclick="
                                                markPaid(
                                                    '${lesson.id}'
                                                )
                                            "
                                        >
                                            Mark paid
                                        </button>
                                      `
                                    : ""
                            }
                            <button
                                class="btn secondary"
                                onclick="
                                    toggleShare(
                                        '${lesson.id}'
                                    )
                                "
                            >
                                ${
                                    lesson.shared_with_parent
                                        ? "Unshare"
                                        : "Share with parent"
                                }
                            </button>
                            <button
                                class="btn danger"
                                onclick="
                                    deleteLesson(
                                        '${lesson.id}'
                                    )
                                "
                            >
                                Delete
                            </button>
                        </div>
                      `
                    : ""
            }
        </div>
    `;
}
// ========================================
// CALENDAR
// ========================================
function renderCalendar(content) {
    const lessons =
        state.lessons.filter(
            lesson =>
                state.profile.role ===
                    "tutor"
                ||
                lesson.shared_with_parent
        );
    content.innerHTML = `
        <main>
            <div class="row">
                <div>
                    <h2>
                        Calendar
                    </h2>
                    <p class="muted small">
                        Lesson schedule
                    </p>
                </div>
                ${
                    state.profile.role ===
                    "tutor"
                        ? `
                            <button
                                class="btn primary"
                                onclick="lessonForm()"
                            >
                                + Lesson
                            </button>
                          `
                        : ""
                }
            </div>
            ${
                lessons
                    .map(
                        lessonCard
                    )
                    .join("")
                ||
                `
                    <div class="empty">
                        No lessons yet.
                    </div>
                `
            }
        </main>
    `;
}
// ========================================
// STUDENTS
// ========================================
function renderStudents(content) {
    if (
        state.profile.role ===
        "parent"
    ) {
        content.innerHTML = `
            <main>
                <h2>
                    My Children
                </h2>
                ${
                    state.students
                        .map(
                            student => `
                                <div class="card">
                                    <b>
                                        ${escapeHTML(
                                            student.name
                                        )}
                                    </b>
                                    <p
                                        class="muted small"
                                        style="margin-top:5px"
                                    >
                                        ${escapeHTML(
                                            student.subject ||
                                            "Tutoring"
                                        )}
                                    </p>
                                </div>
                            `
                        )
                        .join("")
                    ||
                    `
                        <div class="empty">
                            No student linked yet.
                        </div>
                    `
                }
            </main>
        `;
        return;
    }
    content.innerHTML = `
        <main>
            <div class="row">
                <div>
                    <h2>
                        Students
                    </h2>
                    <p class="muted small">
                        Manage your students
                    </p>
                </div>
                <button
                    class="btn primary"
                    onclick="studentForm()"
                >
                    + Student
                </button>
            </div>
            ${
                state.students
                    .map(
                        student => `
                            <div class="card">
                                <div class="row">
                                    <div>
                                        <b>
                                            ${escapeHTML(
                                                student.name
                                            )}
                                        </b>
                                        <p
                                            class="muted small"
                                            style="margin-top:5px"
                                        >
                                            ${escapeHTML(
                                                student.subject ||
                                                "No subject"
                                            )}
                                            ·
                                            ${money(
                                                student.hourly_rate
                                            )}/hr
                                        </p>
                                        ${
                                            student.parent_name
                                                ? `
                                                    <p
                                                        class="muted small"
                                                        style="margin-top:5px"
                                                    >
                                                        Parent:
                                                        ${escapeHTML(
                                                            student.parent_name
                                                        )}
                                                    </p>
                                                  `
                                                : ""
                                        }
                                        ${
                                            student.phone
                                                ? `
                                                    <p
                                                        class="muted small"
                                                        style="margin-top:5px"
                                                    >
                                                        📱
                                                        ${escapeHTML(
                                                            student.phone
                                                        )}
                                                    </p>
                                                  `
                                                : ""
                                        }
                                    </div>
                                    <div
                                        class="actions"
                                    >
                                        <button
                                            class="btn secondary"
                                            onclick="
                                                studentForm(
                                                    '${student.id}'
                                                )
                                            "
                                        >
                                            Edit
                                        </button>
                                        <button
                                            class="btn danger"
                                            onclick="
                                                deleteStudent(
                                                    '${student.id}'
                                                )
                                            "
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `
                    )
                    .join("")
                ||
                `
                    <div class="empty">
                        No students yet.
                    </div>
                `
            }
        </main>
    `;
}
// ========================================
// STUDENT FORM
// ========================================
function studentForm(id = null) {
    const student =
        id
            ? getStudent(id)
            : null;
    const modal =
        document.createElement(
            "div"
        );
    modal.className =
        "modal";
    modal.innerHTML = `
        <div class="modalbox">
            <div class="row">
                <h2>
                    ${
                        student
                            ? "Edit Student"
                            : "New Student"
                    }
                </h2>
                <button
                    class="btn secondary"
                    onclick="closeModal()"
                >
                    ✕
                </button>
            </div>
            <div class="field">
                <label>
                    Student name
                </label>
                <input
                    id="student-name"
                    value="${
                        escapeHTML(
                            student?.name || ""
                        )
                    }"
                    placeholder="e.g. Emily"
                >
            </div>
            <div class="field">
                <label>
                    Parent name
                </label>
                <input
                    id="parent-name"
                    value="${
                        escapeHTML(
                            student?.parent_name || ""
                        )
                    }"
                    placeholder="Parent name"
                >
            </div>
            <div class="field">
                <label>
                    Parent email
                </label>
                <input
                    id="parent-email"
                    type="email"
                    value=""
                    placeholder="Optional"
                >
                <p
                    class="muted small"
                    style="margin-top:5px"
                >
                    Parent linking will be handled
                    by the parent account ID.
                </p>
            </div>
            <div class="field">
                <label>
                    Phone
                </label>
                <input
                    id="student-phone"
                    type="tel"
                    value="${
                        escapeHTML(
                            student?.phone || ""
                        )
                    }"
                >
            </div>
            <div class="field">
                <label>
                    Subject
                </label>
                <input
                    id="student-subject"
                    value="${
                        escapeHTML(
                            student?.subject || ""
                        )
                    }"
                    placeholder="English / Maths / Piano..."
                >
            </div>
            <div class="field">
                <label>
                    Hourly rate
                </label>
                <input
                    id="student-rate"
                    type="number"
                    min="0"
                    step="10"
                    value="${
                        student?.hourly_rate ??
                        250
                    }"
                >
            </div>
            <div class="field">
                <label>
                    Notes
                </label>
                <textarea
                    id="student-notes"
                    placeholder="Optional notes"
                >${
                    escapeHTML(
                        student?.notes || ""
                    )
                }</textarea>
            </div>
            <button
                class="btn primary"
                style="width:100%"
                onclick="
                    saveStudent(
                        '${id || ""}'
                    )
                "
            >
                Save Student
            </button>
        </div>
    `;
    document.body.appendChild(
        modal
    );
}
// ========================================
// SAVE STUDENT
// ========================================
async function saveStudent(id) {
    const name =
        $("#student-name")
            ?.value
            .trim();
    const parentName =
        $("#parent-name")
            ?.value
            .trim();
    const phone =
        $("#student-phone")
            ?.value
            .trim();
    const subject =
        $("#student-subject")
            ?.value
            .trim();
    const hourlyRate =
        Number(
            $("#student-rate")
                ?.value || 0
        );
    const notes =
        $("#student-notes")
            ?.value
            .trim();
    if (!name) {
        alert(
            "Please enter the student's name."
        );
        return;
    }
    if (hourlyRate < 0) {
        alert(
            "Hourly rate cannot be negative."
        );
        return;
    }
    const studentData = {
        tutor_id:
            state.user.id,
        name,
        parent_name:
            parentName,
        phone,
        subject,
        hourly_rate:
            hourlyRate,
        notes
    };
    let result;
    if (id) {
        result =
            await sb
                .from("students")
                .update(
                    studentData
                )
                .eq(
                    "id",
                    id
                )
                .eq(
                    "tutor_id",
                    state.user.id
                );
    } else {
        result =
            await sb
                .from("students")
                .insert(
                    studentData
                );
    }
    if (result.error) {
        console.error(
            result.error
        );
        alert(
            result.error.message
        );
        return;
    }
    closeModal();
    await refreshData();
}
// ========================================
// DELETE STUDENT
// ========================================
async function deleteStudent(id) {
    const student =
        getStudent(id);
    if (!student) {
        return;
    }
    const confirmed =
        confirm(
            `Delete ${student.name}?\n\n` +
            "This may also affect related lesson records."
        );
    if (!confirmed) {
        return;
    }
    const {
        error
    } = await sb
        .from("students")
        .delete()
        .eq(
            "id",
            id
        )
        .eq(
            "tutor_id",
            state.user.id
        );
    if (error) {
        alert(
            error.message
        );
        return;
    }
    await refreshData();
}
// ========================================
// LESSON FORM
// ========================================
function lessonForm(id = null) {
    const lesson =
        id
            ? getLesson(id)
            : null;
    const defaultRate =
        lesson?.hourly_rate ??
        state.students[0]?.hourly_rate ??
        250;
    const modal =
        document.createElement(
            "div"
        );
    modal.className =
        "modal";
    modal.innerHTML = `
        <div class="modalbox">
            <div class="row">
                <h2>
                    ${
                        lesson
                            ? "Edit Lesson"
                            : "New Lesson"
                    }
                </h2>
                <button
                    class="btn secondary"
                    onclick="closeModal()"
                >
                    ✕
                </button>
            </div>
            <div class="field">
                <label>
                    Student
                </label>
                <select
                    id="lesson-student"
                    onchange="updateLessonRate()"
                >
                    <option value="">
                        Select student
                    </option>
                    ${
                        state.students
                            .map(
                                student => `
                                    <option
                                        value="${student.id}"
                                        ${
                                            String(
                                                lesson?.student_id
                                            ) ===
                                            String(
                                                student.id
                                            )
                                                ? "selected"
                                                : ""
                                        }
                                    >
                                        ${escapeHTML(
                                            student.name
                                        )}
                                    </option>
                                `
                            )
                            .join("")
                    }
                </select>
            </div>
            <div class="field">
                <label>
                    Date
                </label>
                <input
                    id="lesson-date"
                    type="date"
                    value="${
                        lesson?.lesson_date ||
                        today()
                    }"
                >
            </div>
            <div class="field">
                <label>
                    Start time
                </label>
                <input
                    id="lesson-start"
                    type="time"
                    value="${
                        lesson?.start_time
                            ? String(
                                lesson.start_time
                            ).slice(0, 5)
                            : "17:00"
                    }"
                >
            </div>
            <div class="field">
                <label>
                    End time
                </label>
                <input
                    id="lesson-end"
                    type="time"
                    value="${
                        lesson?.end_time
                            ? String(
                                lesson.end_time
                            ).slice(0, 5)
                            : "18:30"
                    }"
                >
            </div>
            <div class="field">
                <label>
                    Hourly rate
                </label>
                <input
                    id="lesson-rate"
                    type="number"
                    min="0"
                    step="10"
                    value="${defaultRate}"
                >
            </div>
            <div class="field">
                <label>
                    Status
                </label>
                <select
                    id="lesson-status"
                >
                    <option
                        value="scheduled"
                        ${
                            lesson?.status ===
                                "scheduled" ||
                            !lesson
                                ? "selected"
                                : ""
                        }
                    >
                        Scheduled
                    </option>
                    <option
                        value="completed"
                        ${
                            lesson?.status ===
                                "completed"
                                ? "selected"
                                : ""
                        }
                    >
                        Completed
                    </option>
                    <option
                        value="cancelled"
                        ${
                            lesson?.status ===
                                "cancelled"
                                ? "selected"
                                : ""
                        }
                    >
                        Cancelled
                    </option>
                </select>
            </div>
            <div class="field">
                <label>
                    Payment
                </label>
                <select
                    id="lesson-payment"
                >
                    <option
                        value="unpaid"
                        ${
                            lesson?.payment_status !==
                                "paid"
                                ? "selected"
                                : ""
                        }
                    >
                        Unpaid
                    </option>
                    <option
                        value="paid"
                        ${
                            lesson?.payment_status ===
                                "paid"
                                ? "selected"
                                : ""
                        }
                    >
                        Paid
                    </option>
                </select>
            </div>
            <div class="field">
                <label>
                    Lesson summary
                </label>
                <textarea
                    id="lesson-summary"
                    placeholder="What did you teach?"
                >${
                    escapeHTML(
                        lesson?.lesson_summary ||
                        ""
                    )
                }</textarea>
            </div>
            <div class="field">
                <label>
                    Homework
                </label>
                <textarea
                    id="lesson-homework"
                    placeholder="Homework / practice"
                >${
                    escapeHTML(
                        lesson?.homework ||
                        ""
                    )
                }</textarea>
            </div>
            <button
                class="btn primary"
                style="width:100%"
                onclick="
                    saveLesson(
                        '${id || ""}'
                    )
                "
            >
                Save Lesson
            </button>
        </div>
    `;
    document.body.appendChild(
        modal
    );
}
// ========================================
// UPDATE LESSON RATE
// ========================================
function updateLessonRate() {
    const studentId =
        $("#lesson-student")
            ?.value;
    const student =
        getStudent(
            studentId
        );
    const rateInput =
        $("#lesson-rate");
    if (
        student &&
        rateInput
    ) {
        rateInput.value =
            student.hourly_rate ||
            250;
    }
}
// ========================================
// SAVE LESSON
// ========================================
async function saveLesson(id) {
    const studentId =
        $("#lesson-student")
            ?.value;
    const lessonDate =
        $("#lesson-date")
            ?.value;
    const startTime =
        $("#lesson-start")
            ?.value;
    const endTime =
        $("#lesson-end")
            ?.value;
    const hourlyRate =
        Number(
            $("#lesson-rate")
                ?.value || 0
        );
    const status =
        $("#lesson-status")
            ?.value;
    const paymentStatus =
        $("#lesson-payment")
            ?.value;
    const summary =
        $("#lesson-summary")
            ?.value
            .trim();
    const homework =
        $("#lesson-homework")
            ?.value
            .trim();
    if (!studentId) {
        alert(
            "Please select a student."
        );
        return;
    }
    if (!lessonDate) {
        alert(
            "Please select a lesson date."
        );
        return;
    }
    if (!startTime || !endTime) {
        alert(
            "Please select the lesson time."
        );
        return;
    }
    if (
        timeToMinutes(endTime) <=
        timeToMinutes(startTime)
    ) {
        alert(
            "End time must be later than start time."
        );
        return;
    }
    if (hourlyRate < 0) {
        alert(
            "Hourly rate cannot be negative."
        );
        return;
    }
    const lessonData = {
        tutor_id:
            state.user.id,
        student_id:
            studentId,
        lesson_date:
            lessonDate,
        start_time:
            startTime,
        end_time:
            endTime,
        hourly_rate:
            hourlyRate,
        status,
        payment_status:
            paymentStatus,
        lesson_summary:
            summary,
        homework
    };
    let result;
    if (id) {
        result =
            await sb
                .from("lessons")
                .update(
                    lessonData
                )
                .eq(
                    "id",
                    id
                )
                .eq(
                    "tutor_id",
                    state.user.id
                );
    } else {
        result =
            await sb
                .from("lessons")
                .insert(
                    lessonData
                );
    }
    if (result.error) {
        console.error(
            result.error
        );
        alert(
            result.error.message
        );
        return;
    }
    closeModal();
    await refreshData();
}
// ========================================
// EDIT LESSON
// ========================================
function editLesson(id) {
    lessonForm(id);
}
// ========================================
// DELETE LESSON
// ========================================
async function deleteLesson(id) {
    const lesson =
        getLesson(id);
    if (!lesson) {
        return;
    }
    const student =
        getStudent(
            lesson.student_id
        );
    const confirmed =
        confirm(
            `Delete the lesson for ${
                student?.name ||
                "this student"
            }?`
        );
    if (!confirmed) {
        return;
    }
    const {
        error
    } = await sb
        .from("lessons")
        .delete()
        .eq(
            "id",
            id
        )
        .eq(
            "tutor_id",
            state.user.id
        );
    if (error) {
        alert(
            error.message
        );
        return;
    }
    await refreshData();
}
// ========================================
// MARK LESSON PAID
// ========================================
async function markPaid(id) {
    const lesson =
        getLesson(id);
    if (!lesson) {
        return;
    }
    const {
        error
    } = await sb
        .from("lessons")
        .update({
            payment_status:
                "paid"
        })
        .eq(
            "id",
            id
        )
        .eq(
            "tutor_id",
            state.user.id
        );
    if (error) {
        alert(
            error.message
        );
        return;
    }
    await refreshData();
}
// ========================================
// SHARE / UNSHARE
// ========================================
async function toggleShare(id) {
    const lesson =
        getLesson(id);
    if (!lesson) {
        return;
    }
    const {
        error
    } = await sb
        .from("lessons")
        .update({
            shared_with_parent:
                !lesson.shared_with_parent
        })
        .eq(
            "id",
            id
        )
        .eq(
            "tutor_id",
            state.user.id
        );
    if (error) {
        alert(
            error.message
        );
        return;
    }
    await refreshData();
}
// ========================================
// MONEY PAGE
// ========================================
function renderMoney(content) {
    const totalPaid =
        state.payments.reduce(
            (
                total,
                payment
            ) =>
                total +
                Number(
                    payment.amount || 0
                ),
            0
        );
    const unpaidLessons =
        state.lessons.filter(
            lesson =>
                lesson.payment_status ===
                    "unpaid"
                &&
                lesson.status !==
                    "cancelled"
        );
    const outstanding =
        unpaidLessons.reduce(
            (
                total,
                lesson
            ) =>
                total +
                lessonFee(lesson),
            0
        );
    content.innerHTML = `
        <main>
            <h2>
                Money
            </h2>
            <p
                class="muted small"
                style="margin-top:5px"
            >
                Payment tracking
            </p>
            <div
                class="grid"
                style="padding:15px 0"
            >
                ${statCard(
                    "Recorded payments",
                    money(totalPaid)
                )}
                ${statCard(
                    "Outstanding",
                    money(outstanding)
                )}
                ${statCard(
                    "Paid lessons",
                    state.lessons.filter(
                        lesson =>
                            lesson.payment_status ===
                            "paid"
                    ).length
                )}
                ${statCard(
                    "Unpaid lessons",
                    unpaidLessons.length
                )}
            </div>
            ${
                state.profile.role ===
                "tutor"
                    ? `
                        <button
                            class="btn primary"
                            onclick="paymentForm()"
                            style="margin-bottom:15px"
                        >
                            + Record Payment
                        </button>
                      `
                    : ""
            }
            <h3>
                Payment History
            </h3>
            ${
                state.payments
                    .map(
                        payment => {
                            const student =
                                getStudent(
                                    payment.student_id
                                );
                            return `
                                <div class="card">
                                    <div class="row">
                                        <div>
                                            <b>
                                                ${escapeHTML(
                                                    student?.name ||
                                                    "Student"
                                                )}
                                            </b>
                                            <p
                                                class="muted small"
                                            >
                                                ${formatDate(
                                                    payment.payment_date
                                                )}
                                                ·
                                                ${escapeHTML(
                                                    payment.method ||
                                                    "Other"
                                                )}
                                            </p>
                                        </div>
                                        <b>
                                            ${money(
                                                payment.amount
                                            )}
                                        </b>
                                    </div>
                                    ${
                                        payment.note
                                            ? `
                                                <p
                                                    class="muted small"
                                                    style="margin-top:7px"
                                                >
                                                    ${escapeHTML(
                                                        payment.note
                                                    )}
                                                </p>
                                              `
                                            : ""
                                    }
                                </div>
                            `;
                        }
                    )
                    .join("")
                ||
                `
                    <div class="empty">
                        No payment records yet.
                    </div>
                `
            }
            ${
                state.profile.role ===
                "tutor"
                    ? `
                        <h3
                            style="margin-top:25px"
                        >
                            Outstanding Lessons
                        </h3>
                        ${
                            unpaidLessons
                                .map(
                                    lessonCard
                                )
                                .join("")
                            ||
                            `
                                <div class="empty">
                                    No outstanding payments.
                                </div>
                            `
                        }
                      `
                    : ""
            }
        </main>
    `;
}
// ========================================
// PAYMENT FORM
// ========================================
function paymentForm() {
    const modal =
        document.createElement(
            "div"
        );
    modal.className =
        "modal";
    modal.innerHTML = `
        <div class="modalbox">
            <div class="row">
                <h2>
                    Record Payment
                </h2>
                <button
                    class="btn secondary"
                    onclick="closeModal()"
                >
                    ✕
                </button>
            </div>
            <div class="field">
                <label>
                    Student
                </label>
                <select id="payment-student">
                    <option value="">
                        Select student
                    </option>
                    ${
                        state.students
                            .map(
                                student => `
                                    <option
                                        value="${student.id}"
                                    >
                                        ${escapeHTML(
                                            student.name
                                        )}
                                    </option>
                                `
                            )
                            .join("")
                    }
                </select>
            </div>
            <div class="field">
                <label>
                    Amount
                </label>
                <input
                    id="payment-amount"
                    type="number"
                    min="0"
                    step="10"
                    placeholder="250"
                >
            </div>
            <div class="field">
                <label>
                    Payment date
                </label>
                <input
                    id="payment-date"
                    type="date"
                    value="${today()}"
                >
            </div>
            <div class="field">
                <label>
                    Payment method
                </label>
                <select id="payment-method">
                    <option value="FPS">
                        FPS
                    </option>
                    <option value="PayMe">
                        PayMe
                    </option>
                    <option value="Cash">
                        Cash
                    </option>
                    <option value="Bank Transfer">
                        Bank Transfer
                    </option>
                    <option value="AlipayHK">
                        AlipayHK
                    </option>
                    <option value="WeChat Pay">
                        WeChat Pay
                    </option>
                    <option value="Other">
                        Other
                    </option>
                </select>
            </div>
            <div class="field">
                <label>
                    Note
                </label>
                <textarea
                    id="payment-note"
                    placeholder="Optional"
                ></textarea>
            </div>
            <button
                class="btn primary"
                style="width:100%"
                onclick="savePayment()"
            >
                Save Payment
            </button>
        </div>
    `;
    document.body.appendChild(
        modal
    );
}
// ========================================
// SAVE PAYMENT
// ========================================
async function savePayment() {
    const studentId =
        $("#payment-student")
            ?.value;
    const amount =
        Number(
            $("#payment-amount")
                ?.value || 0
        );
    const paymentDate =
        $("#payment-date")
            ?.value;
    const method =
        $("#payment-method")
            ?.value;
    const note =
        $("#payment-note")
            ?.value
            .trim();
    if (!studentId) {
        alert(
            "Please select a student."
        );
        return;
    }
    if (
        !amount ||
        amount <= 0
    ) {
        alert(
            "Please enter a valid payment amount."
        );
        return;
    }
    if (!paymentDate) {
        alert(
            "Please select a payment date."
        );
        return;
    }
    const {
        error
    } = await sb
        .from("payments")
        .insert({
            tutor_id:
                state.user.id,
            student_id:
                studentId,
            amount,
            payment_date:
                paymentDate,
            method,
            note
        });
    if (error) {
        console.error(
            error
        );
        alert(
            error.message
        );
        return;
    }
    closeModal();
    await refreshData();
}
// ========================================
// ACCOUNT
// ========================================
function renderAccount(content) {
    content.innerHTML = `
        <main>
            <h2>
                Account
            </h2>
            <div class="card">
                <p class="muted small">
                    Email
                </p>
                <b>
                    ${escapeHTML(
                        state.user.email
                    )}
                </b>
            </div>
            <div class="card">
                <p class="muted small">
                    Name
                </p>
                <b>
                    ${escapeHTML(
                        state.profile.full_name ||
                        "Not set"
                    )}
                </b>
            </div>
            <div class="card">
                <p class="muted small">
                    Account type
                </p>
                <b>
                    ${escapeHTML(
                        state.profile.role
                    )}
                </b>
            </div>
            <div class="card">
                <p class="muted small">
                    Students
                </p>
                <b>
                    ${state.students.length}
                </b>
            </div>
            <button
                class="btn danger"
                onclick="logout()"
            >
                Log out
            </button>
        </main>
    `;
}
// ========================================
// START APP
// ========================================
init();
