const urlBase = "https://lbazkpkvkvarimnqzgqb.supabase.co/rest/v1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiYXprcGt2a3ZhcmltbnF6Z3FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI4MzY5MSwiZXhwIjoyMDg2ODU5NjkxfQ.RDYx8KsUzlMNT5qb7WfTF4dCrp3dEx8eqSmC0b1g8E0";

const headers = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json"
};

async function cleanOrphanedRewards() {
    try {
        // 1. Fetch profiles
        const profilesRes = await fetch(`${urlBase}/profiles?select=id,full_name,role,is_active`, { headers });
        const profiles = await profilesRes.json();
        const profileIds = new Set(profiles.map(p => p.id));

        // 2. Fetch rewards
        const rewardsRes = await fetch(`${urlBase}/rewards?select=id,title,user_id,is_active`, { headers });
        const rewards = await rewardsRes.json();

        console.log(`Total Profiles: ${profiles.length}`);
        console.log(`Total Rewards: ${rewards.length}`);

        const orphaned = rewards.filter(r => !profileIds.has(r.user_id));
        console.log(`Orphaned Rewards found: ${orphaned.length}`);

        for (const r of orphaned) {
            console.log(`Deleting orphaned reward: ID=${r.id}, Title="${r.title}", UserID=${r.user_id}`);
            await fetch(`${urlBase}/rewards?id=eq.${r.id}`, {
                method: 'DELETE',
                headers
            });
        }

        console.log("Cleanup completed successfully.");
    } catch (err) {
        console.error("Error during cleanup:", err);
    }
}

cleanOrphanedRewards();
