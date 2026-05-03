import { db } from "../src/index";
import { usersTable } from "../src/schema/users";
import { groupsTable, groupMembersTable } from "../src/schema/groups";
import { matchesTable, matchPlayersTable } from "../src/schema/matches";
import { ratingsTable } from "../src/schema/ratings";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Starting comprehensive seed test...");

  // 1. Create >20 Accounts
  const usersToInsert = Array.from({ length: 25 }).map((_, i) => {
    return {
      id: `seed_user_${i}`,
      phone: `+9665000000${String(i).padStart(2, "0")}`,
      name: `Test User ${i}`,
      sports: JSON.stringify(["football", "padel"]),
      sportProfiles: JSON.stringify({
        football: { sport: "football", skillLevel: "متوسط", position: ["مهاجم"] },
        padel: { sport: "padel", skillLevel: "مبتدئ", position: [] }
      }),
      reliability: 80,
    };
  });

  console.log("Inserting users...");
  for (const user of usersToInsert) {
    await db.insert(usersTable).values(user).onConflictDoNothing();
  }

  // 2. Create Groups (Public & Private)
  console.log("Inserting groups...");
  const publicGroupId = "seed_group_public";
  const privateGroupId = "seed_group_private";
  
  await db.insert(groupsTable).values([
    {
      id: publicGroupId,
      name: "Public Seed Group",
      sport: "football",
      description: "A public group for testing",
      isPublic: true,
      adminId: "seed_user_0"
    },
    {
      id: privateGroupId,
      name: "Private Seed Group",
      sport: "padel",
      description: "A private group for testing",
      isPublic: false,
      adminId: "seed_user_1"
    }
  ]).onConflictDoNothing();

  // Add members to groups
  const groupMembers = [
    { id: "gm_1", groupId: publicGroupId, userId: "seed_user_0", role: "owner" },
    { id: "gm_2", groupId: publicGroupId, userId: "seed_user_2", role: "member" },
    { id: "gm_3", groupId: privateGroupId, userId: "seed_user_1", role: "owner" },
    { id: "gm_4", groupId: privateGroupId, userId: "seed_user_3", role: "member" },
  ];
  for (const gm of groupMembers) {
     await db.insert(groupMembersTable).values(gm).onConflictDoNothing();
  }

  // 3. Create Matches (Public & Private)
  console.log("Inserting matches...");
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  
  const publicMatchId = "seed_match_public";
  const privateMatchId = "seed_match_private";

  await db.insert(matchesTable).values([
    {
      id: publicMatchId,
      title: "Public Football Match",
      sport: "football",
      date: dateStr,
      time: "20:00",
      venue: "Seed Stadium",
      maxPlayers: 10,
      cost: 20,
      isPublic: true,
      organizerId: "seed_user_0",
      status: "completed",
    },
    {
      id: privateMatchId,
      title: "Private Padel Match",
      sport: "padel",
      date: dateStr,
      time: "21:00",
      venue: "Seed Padel Court",
      maxPlayers: 4,
      cost: 50,
      isPublic: false,
      organizerId: "seed_user_1",
      status: "completed",
    }
  ]).onConflictDoNothing();

  // 4. Join Matches
  console.log("Joining matches...");
  const matchPlayers = [
    { id: "mp_1", matchId: publicMatchId, userId: "seed_user_0", position: "مهاجم" },
    { id: "mp_2", matchId: publicMatchId, userId: "seed_user_2", position: "مدافع" },
    { id: "mp_3", matchId: publicMatchId, userId: "seed_user_3", position: "حارس" },
    
    { id: "mp_4", matchId: privateMatchId, userId: "seed_user_1", position: "يمين" },
    { id: "mp_5", matchId: privateMatchId, userId: "seed_user_4", position: "يسار" },
  ];
  for (const mp of matchPlayers) {
    await db.insert(matchPlayersTable).values(mp).onConflictDoNothing();
  }

  // 5. Test Player Ratings
  console.log("Inserting ratings...");
  const ratings = [
    {
      id: "rt_1",
      matchId: publicMatchId,
      raterId: "seed_user_0",
      ratedUserId: "seed_user_2",
      score: 5,
      ratingType: "artist",
      levelAccuracyVote: "accurate"
    },
    {
      id: "rt_2",
      matchId: publicMatchId,
      raterId: "seed_user_2",
      ratedUserId: "seed_user_0",
      score: 5,
      ratingType: "rock",
      levelAccuracyVote: "higher"
    }
  ];
  for (const rt of ratings) {
    await db.insert(ratingsTable).values(rt).onConflictDoNothing();
  }

  console.log("Comprehensive seed test completed successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
