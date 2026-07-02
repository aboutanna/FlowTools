const Database = {

    Timeline: {

        async load() {

            const user = await Auth.currentUser();

            const result = await db
                .from("timeline_memos")
                .select("*")
                .eq("user_id", user.id)
                .order("timestamp", {
                    ascending: false
                });

            if (result.error) {
                console.error("Timeline.load:", result.error);
            }

            return result;

        },

        async add(text, timestamp) {

            const user = await Auth.currentUser();

            return await db
                .from("timeline_memos")
                .insert({
                    user_id: user.id,
                    text,
                    timestamp
                });

        },

        async remove(id) {

            const user = await Auth.currentUser();

            return await db
                .from("timeline_memos")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

        }

    }

};