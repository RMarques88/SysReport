// Simple shared state
const state = {
    currentUser: window.currentUser || {},
    allUsers: [],
    allTypes: [],
    allAdminReports: [],
    allUserReports: [],
};

export function getState() {
    return state;
}

export function setCurrentUser(updates) {
    state.currentUser = { ...state.currentUser, ...updates };
    window.currentUser = state.currentUser;
}

export function setAllUsers(users) {
    state.allUsers = users;
    window.allUsers = users;
}

export function setAllAdminReports(reports) {
    state.allAdminReports = reports;
    window.allAdminReports = reports;
}

export function setAllUserReports(reports) {
    state.allUserReports = reports;
    window.allUserReports = reports;
}
