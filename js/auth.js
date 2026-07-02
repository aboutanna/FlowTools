const Auth = {

    async login(email, password) {

        return await db.auth.signInWithPassword({

            email,
            password

        });

    },

    async register(email, password) {

        return await db.auth.signUp({

            email,
            password

        });

    },

    async logout() {

        await db.auth.signOut();

        location.href = "index.html";

    },

    async currentUser() {

        const {

            data: { user }

        } = await db.auth.getUser();

        return user;

    },

    async requireLogin() {

        const {

            data: { session }

        } = await db.auth.getSession();

        if (!session) {

            location.href = "index.html";

            return null;

        }

        return session.user;

    }

};

db.auth.onAuthStateChange((event, session) => {

    console.log("Auth:", event);

});