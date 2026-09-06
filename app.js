// ========================================
// TUTOR MANAGER V3
// ========================================

// ----------------------------------------
// SUPABASE CONFIG
// ----------------------------------------

// Replace these two values with your own
// Supabase Project URL and Publishable Key.

const SUPABASE_URL =
    "PASTE_YOUR_SUPABASE_URL";

const SUPABASE_KEY =
    "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY";


// ----------------------------------------
// SUPABASE CLIENT
// ----------------------------------------

const { createClient } = window.supabase;

const sb = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ----------------------------------------
// APP STATE
// ----------------------------------------

let state = {

    user: null,

    profile: null,

    students: [],

    lessons: [],

    payments: [],

    page: "home"

};


// ----------------------------------------
// HELPERS
// ----------------------------------------

const $ = selector =>
    document.querySelector(selector);


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/[&<>"']/g, character => {

            const map = {

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            };

            return map[character];

        });

}


function money(amount) {

    return "$" +
        Number(amount || 0)
            .toLocaleString(
                "en-HK",
                {
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

    return state.students
        .find(student => student.id === id);

}


function timeToMinutes(time) {

    const parts =
        String(time)
            .slice(0, 5)
            .split(":")
            .map(Number);

    return parts[0] * 60 + parts[1];

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

    return lessonHours(lesson) *
        Number(
            lesson.hourly_rate || 0
        );

}


function formatDate(date) {

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


// ========================================
// INITIALISE
// ========================================

async function init() {

    const {
        data: {
            session
        }
    } = await sb.auth.getSession();


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

                renderLogin();

            }

        }
    );

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
        .eq("id", user.id)
        .single();


    if (error) {

        alert(
            "Could not load profile: " +
            error.message
        );

        console.error(error);

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
        !state.profile ||
        !state.user
    ) {

        return;

    }


    if (
        state.profile.role === "tutor"
    ) {

        const [
            students,
            lessons,
            payments
        ] = await Promise.all([

            sb
                .from("students")
                .select("*")
                .order("name"),

            sb
                .from("lessons")
                .select("*")
                .order(
                    "lesson_date",
                    {
                        ascending: false
                    }
                )
                .order("start_time"),

            sb
                .from("payments")
                .select("*")
                .order(
                    "payment_date",
                    {
                        ascending: false
                    }
                )

        ]);


        state.students =
            students.data || [];

        state.lessons =
            lessons.data || [];

        state.payments =
            payments.data || [];


    } else {

        const [
            students,
            lessons,
            payments
        ] = await Promise.all([

            sb
                .from("students")
                .select("*")
                .eq(
                    "parent_user_id",
                    state.user.id
                )
                .order("name"),

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
                ),

            sb
                .from("payments")
                .select("*")
                .order(
                    "payment_date",
                    {
                        ascending: false
                    }
                )

        ]);


        state.students =
            students.data || [];

        state.lessons =
            lessons.data || [];

        state.payments =
            payments.data || [];

    }


    render();

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
                    V3 Tutor + Parent Portal
                </p>


                <div class="field">

                    <label>
                        Email
                    </label>

                    <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                    >

                </div>


                <div class="field">

                    <label>
                        Password
                    </label>

                    <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                    >

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


                <div
                    class="field"
                    style="margin-top:18px"
                >

                    <label>
                        New account role
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

            </div>

        </div>

    `;

}


// ========================================
// LOGIN
// ========================================

async function login() {

    const email =
        $("#email").value.trim();

    const password =
        $("#password").value;


    if (!email || !password) {

        alert(
            "Please enter email and password."
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

        alert(error.message);

    }

}


// ========================================
// SIGN UP
// ========================================

async function signup() {

    const email =
        $("#email").value.trim();

    const password =
        $("#password").value;

    const role =
        $("#role").value;


    if (!email || !password) {

        alert(
            "Please enter email and password."
        );

        return;

    }


    const {
        error
    } = await sb.auth.signUp({

        email,

        password,

        options: {

            data: {

                role: role,

                full_name:
                    email.split("@")[0]

            }

        }

    });


    if (error) {

        alert(error.message);

    } else {

        alert(
            "Account created. " +
            "Check your email if confirmation is enabled."
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
// MAIN APP
// ========================================

function render() {

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


    if (page === "home") {

        renderHome(content);

    }


    if (page === "calendar") {

        renderCalendar(content);

    }


    if (page === "students") {

        renderStudents(content);

    }


    if (page === "money") {

        renderMoney(content);

    }


    if (page === "account") {

        renderAccount(content);

    }


    document
        .querySelectorAll(".nav button")
        .forEach(button => {

            button.classList.remove(
                "active"
            );

        });


    const buttons =
        [
            ...document
                .querySelectorAll(
                    ".nav button"
                )
        ];


    const pages = [
        "home",
        "calendar",
        "students",
        "money",
        "account"
    ];


    const index =
        pages.indexOf(page);


    if (index >= 0) {

        buttons[index]
            ?.classList.add("active");

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
                lesson.lesson_date
                    .startsWith(
                        currentMonth
                    ) &&
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
                (total, lesson) =>
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
                (total, lesson) =>
                    total +
                    lessonFee(lesson),
                0
            );


    const totalHours =
        monthLessons.reduce(
            (total, lesson) =>
                total +
                lessonHours(lesson),
            0
        );


    const todayLessons =
        state.lessons.filter(
            lesson =>
                lesson.lesson_date ===
                    today() &&
                lesson.status !==
                    "cancelled"
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

                            : "Shared lessons"
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


            <div>

                ${
                    todayLessons.length

                        ? todayLessons
                            .map(
                                lessonCard
                            )
                            .join("")

                        : `
                            <div class="empty">
                                No classes today.
                            </div>
                          `
                }

            </div>


            <h3
                style="margin-top:25px"
            >
                Upcoming
            </h3>


            <div>

                ${
                    state.lessons
                        .filter(
                            lesson =>
                                lesson.lesson_date >
                                    today() &&
                                lesson.status !==
                                    "cancelled"
                        )
                        .slice(0, 5)
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

            </div>

        </main>

    `;

}


function statCard(
    title,
    value
) {

    return `

        <div class="stat">

            <span class="muted small">
                ${title}
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
            "parent" &&
        !lesson.shared_with_parent
    ) {

        return "";

    }


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
                        class="badge ${
                            lesson.payment_status ===
                            "paid"

                                ? "paid"

                                : "unpaid"
                        }"
                    >

                        ${lesson.payment_status}

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
                                lesson.payment_status ===
                                "unpaid"

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
                    "tutor" ||
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
                                    >
                                        ${escapeHTML(
                                            student.subject ||
                                            ""
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
