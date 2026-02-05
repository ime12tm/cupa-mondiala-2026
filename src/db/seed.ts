import "dotenv/config";
import { db } from "./index";
import {
  tournamentStages,
  teams,
  venues,
  matches,
  type NewTournamentStage,
  type NewTeam,
  type NewVenue,
  type NewMatch,
} from "./schema";

async function seed() {
  console.log("🌱 Starting database seed...");

  // Clear existing data (in reverse order of dependencies)
  console.log("🧹 Clearing existing data...");
  await db.delete(matches);
  await db.delete(teams);
  await db.delete(venues);
  await db.delete(tournamentStages);

  // Seed tournament stages
  console.log("📊 Seeding tournament stages...");
  const stages: NewTournamentStage[] = [
    {
      name: "Group Stage",
      slug: "group_stage",
      sortOrder: 1,
      pointsMultiplier: 1.0,
    },
    {
      name: "Round of 16",
      slug: "round_of_16",
      sortOrder: 2,
      pointsMultiplier: 1.5,
    },
    {
      name: "Quarter-finals",
      slug: "quarter_finals",
      sortOrder: 3,
      pointsMultiplier: 2.0,
    },
    {
      name: "Semi-finals",
      slug: "semi_finals",
      sortOrder: 4,
      pointsMultiplier: 2.5,
    },
    {
      name: "Third Place",
      slug: "third_place",
      sortOrder: 5,
      pointsMultiplier: 2.5,
    },
    {
      name: "Final",
      slug: "final",
      sortOrder: 6,
      pointsMultiplier: 3.0,
    },
  ];
  await db.insert(tournamentStages).values(stages);
  console.log(`✅ Inserted ${stages.length} tournament stages`);

  // Seed venues (16 stadiums across USA, Canada, Mexico)
  console.log("🏟️  Seeding venues...");
  const venuesList: NewVenue[] = [
    // USA venues
    {
      name: "MetLife Stadium",
      city: "East Rutherford",
      country: "USA",
      capacity: 82500,
      timezone: "America/New_York",
    },
    {
      name: "SoFi Stadium",
      city: "Inglewood",
      country: "USA",
      capacity: 70240,
      timezone: "America/Los_Angeles",
    },
    {
      name: "AT&T Stadium",
      city: "Arlington",
      country: "USA",
      capacity: 80000,
      timezone: "America/Chicago",
    },
    {
      name: "Mercedes-Benz Stadium",
      city: "Atlanta",
      country: "USA",
      capacity: 71000,
      timezone: "America/New_York",
    },
    {
      name: "Hard Rock Stadium",
      city: "Miami Gardens",
      country: "USA",
      capacity: 64767,
      timezone: "America/New_York",
    },
    {
      name: "NRG Stadium",
      city: "Houston",
      country: "USA",
      capacity: 72220,
      timezone: "America/Chicago",
    },
    {
      name: "Arrowhead Stadium",
      city: "Kansas City",
      country: "USA",
      capacity: 76416,
      timezone: "America/Chicago",
    },
    {
      name: "Lincoln Financial Field",
      city: "Philadelphia",
      country: "USA",
      capacity: 69176,
      timezone: "America/New_York",
    },
    {
      name: "Levi's Stadium",
      city: "Santa Clara",
      country: "USA",
      capacity: 68500,
      timezone: "America/Los_Angeles",
    },
    {
      name: "Gillette Stadium",
      city: "Foxborough",
      country: "USA",
      capacity: 65878,
      timezone: "America/New_York",
    },
    {
      name: "Lumen Field",
      city: "Seattle",
      country: "USA",
      capacity: 68740,
      timezone: "America/Los_Angeles",
    },
    // Canada venues
    {
      name: "BMO Field",
      city: "Toronto",
      country: "Canada",
      capacity: 45500,
      timezone: "America/Toronto",
    },
    {
      name: "BC Place",
      city: "Vancouver",
      country: "Canada",
      capacity: 54500,
      timezone: "America/Vancouver",
    },
    // Mexico venues
    {
      name: "Estadio Azteca",
      city: "Mexico City",
      country: "Mexico",
      capacity: 87523,
      timezone: "America/Mexico_City",
    },
    {
      name: "Estadio BBVA",
      city: "Monterrey",
      country: "Mexico",
      capacity: 53500,
      timezone: "America/Monterrey",
    },
    {
      name: "Estadio Akron",
      city: "Guadalajara",
      country: "Mexico",
      capacity: 46232,
      timezone: "America/Mexico_City",
    },
  ];
  await db.insert(venues).values(venuesList);
  console.log(`✅ Inserted ${venuesList.length} venues`);

  // Seed teams (48 teams in 12 groups of 4)
  console.log("⚽ Seeding teams...");
  const teamsList: NewTeam[] = [
    // Group A
    {
      name: "Mexico",
      code: "MEX",
      groupLetter: "A",
      confederation: "CONCACAF",
      fifaRanking: 15,
      flagUrl: "https://flagcdn.com/w320/mx.png",
    },
    {
      name: "Ecuador",
      code: "ECU",
      groupLetter: "A",
      confederation: "CONMEBOL",
      fifaRanking: 30,
      flagUrl: "https://flagcdn.com/w320/ec.png",
    },
    {
      name: "Venezuela",
      code: "VEN",
      groupLetter: "A",
      confederation: "CONMEBOL",
      fifaRanking: 40,
      flagUrl: "https://flagcdn.com/w320/ve.png",
    },
    {
      name: "Jamaica",
      code: "JAM",
      groupLetter: "A",
      confederation: "CONCACAF",
      fifaRanking: 55,
      flagUrl: "https://flagcdn.com/w320/jm.png",
    },
    // Group B
    {
      name: "Argentina",
      code: "ARG",
      groupLetter: "B",
      confederation: "CONMEBOL",
      fifaRanking: 1,
      flagUrl: "https://flagcdn.com/w320/ar.png",
    },
    {
      name: "Peru",
      code: "PER",
      groupLetter: "B",
      confederation: "CONMEBOL",
      fifaRanking: 35,
      flagUrl: "https://flagcdn.com/w320/pe.png",
    },
    {
      name: "Chile",
      code: "CHI",
      groupLetter: "B",
      confederation: "CONMEBOL",
      fifaRanking: 42,
      flagUrl: "https://flagcdn.com/w320/cl.png",
    },
    {
      name: "Canada",
      code: "CAN",
      groupLetter: "B",
      confederation: "CONCACAF",
      fifaRanking: 48,
      flagUrl: "https://flagcdn.com/w320/ca.png",
    },
    // Group C
    {
      name: "USA",
      code: "USA",
      groupLetter: "C",
      confederation: "CONCACAF",
      fifaRanking: 13,
      flagUrl: "https://flagcdn.com/w320/us.png",
    },
    {
      name: "Uruguay",
      code: "URU",
      groupLetter: "C",
      confederation: "CONMEBOL",
      fifaRanking: 11,
      flagUrl: "https://flagcdn.com/w320/uy.png",
    },
    {
      name: "Panama",
      code: "PAN",
      groupLetter: "C",
      confederation: "CONCACAF",
      fifaRanking: 52,
      flagUrl: "https://flagcdn.com/w320/pa.png",
    },
    {
      name: "Bolivia",
      code: "BOL",
      groupLetter: "C",
      confederation: "CONMEBOL",
      fifaRanking: 85,
      flagUrl: "https://flagcdn.com/w320/bo.png",
    },
    // Group D
    {
      name: "Brazil",
      code: "BRA",
      groupLetter: "D",
      confederation: "CONMEBOL",
      fifaRanking: 4,
      flagUrl: "https://flagcdn.com/w320/br.png",
    },
    {
      name: "Colombia",
      code: "COL",
      groupLetter: "D",
      confederation: "CONMEBOL",
      fifaRanking: 9,
      flagUrl: "https://flagcdn.com/w320/co.png",
    },
    {
      name: "Paraguay",
      code: "PAR",
      groupLetter: "D",
      confederation: "CONMEBOL",
      fifaRanking: 58,
      flagUrl: "https://flagcdn.com/w320/py.png",
    },
    {
      name: "Costa Rica",
      code: "CRC",
      groupLetter: "D",
      confederation: "CONCACAF",
      fifaRanking: 50,
      flagUrl: "https://flagcdn.com/w320/cr.png",
    },
    // Group E
    {
      name: "Germany",
      code: "GER",
      groupLetter: "E",
      confederation: "UEFA",
      fifaRanking: 10,
      flagUrl: "https://flagcdn.com/w320/de.png",
    },
    {
      name: "Netherlands",
      code: "NED",
      groupLetter: "E",
      confederation: "UEFA",
      fifaRanking: 8,
      flagUrl: "https://flagcdn.com/w320/nl.png",
    },
    {
      name: "Denmark",
      code: "DEN",
      groupLetter: "E",
      confederation: "UEFA",
      fifaRanking: 18,
      flagUrl: "https://flagcdn.com/w320/dk.png",
    },
    {
      name: "Japan",
      code: "JPN",
      groupLetter: "E",
      confederation: "AFC",
      fifaRanking: 20,
      flagUrl: "https://flagcdn.com/w320/jp.png",
    },
    // Group F
    {
      name: "Spain",
      code: "ESP",
      groupLetter: "F",
      confederation: "UEFA",
      fifaRanking: 3,
      flagUrl: "https://flagcdn.com/w320/es.png",
    },
    {
      name: "England",
      code: "ENG",
      groupLetter: "F",
      confederation: "UEFA",
      fifaRanking: 5,
      flagUrl: "https://flagcdn.com/w320/gb-eng.png",
    },
    {
      name: "Belgium",
      code: "BEL",
      groupLetter: "F",
      confederation: "UEFA",
      fifaRanking: 7,
      flagUrl: "https://flagcdn.com/w320/be.png",
    },
    {
      name: "Morocco",
      code: "MAR",
      groupLetter: "F",
      confederation: "CAF",
      fifaRanking: 14,
      flagUrl: "https://flagcdn.com/w320/ma.png",
    },
    // Group G
    {
      name: "France",
      code: "FRA",
      groupLetter: "G",
      confederation: "UEFA",
      fifaRanking: 2,
      flagUrl: "https://flagcdn.com/w320/fr.png",
    },
    {
      name: "Portugal",
      code: "POR",
      groupLetter: "G",
      confederation: "UEFA",
      fifaRanking: 6,
      flagUrl: "https://flagcdn.com/w320/pt.png",
    },
    {
      name: "Croatia",
      code: "CRO",
      groupLetter: "G",
      confederation: "UEFA",
      fifaRanking: 12,
      flagUrl: "https://flagcdn.com/w320/hr.png",
    },
    {
      name: "Senegal",
      code: "SEN",
      groupLetter: "G",
      confederation: "CAF",
      fifaRanking: 21,
      flagUrl: "https://flagcdn.com/w320/sn.png",
    },
    // Group H
    {
      name: "Italy",
      code: "ITA",
      groupLetter: "H",
      confederation: "UEFA",
      fifaRanking: 16,
      flagUrl: "https://flagcdn.com/w320/it.png",
    },
    {
      name: "Switzerland",
      code: "SUI",
      groupLetter: "H",
      confederation: "UEFA",
      fifaRanking: 17,
      flagUrl: "https://flagcdn.com/w320/ch.png",
    },
    {
      name: "Ukraine",
      code: "UKR",
      groupLetter: "H",
      confederation: "UEFA",
      fifaRanking: 25,
      flagUrl: "https://flagcdn.com/w320/ua.png",
    },
    {
      name: "South Korea",
      code: "KOR",
      groupLetter: "H",
      confederation: "AFC",
      fifaRanking: 28,
      flagUrl: "https://flagcdn.com/w320/kr.png",
    },
    // Group I
    {
      name: "Poland",
      code: "POL",
      groupLetter: "I",
      confederation: "UEFA",
      fifaRanking: 29,
      flagUrl: "https://flagcdn.com/w320/pl.png",
    },
    {
      name: "Sweden",
      code: "SWE",
      groupLetter: "I",
      confederation: "UEFA",
      fifaRanking: 19,
      flagUrl: "https://flagcdn.com/w320/se.png",
    },
    {
      name: "Australia",
      code: "AUS",
      groupLetter: "I",
      confederation: "AFC",
      fifaRanking: 26,
      flagUrl: "https://flagcdn.com/w320/au.png",
    },
    {
      name: "Egypt",
      code: "EGY",
      groupLetter: "I",
      confederation: "CAF",
      fifaRanking: 36,
      flagUrl: "https://flagcdn.com/w320/eg.png",
    },
    // Group J
    {
      name: "Serbia",
      code: "SRB",
      groupLetter: "J",
      confederation: "UEFA",
      fifaRanking: 33,
      flagUrl: "https://flagcdn.com/w320/rs.png",
    },
    {
      name: "Turkey",
      code: "TUR",
      groupLetter: "J",
      confederation: "UEFA",
      fifaRanking: 27,
      flagUrl: "https://flagcdn.com/w320/tr.png",
    },
    {
      name: "Iran",
      code: "IRN",
      groupLetter: "J",
      confederation: "AFC",
      fifaRanking: 22,
      flagUrl: "https://flagcdn.com/w320/ir.png",
    },
    {
      name: "Saudi Arabia",
      code: "KSA",
      groupLetter: "J",
      confederation: "AFC",
      fifaRanking: 56,
      flagUrl: "https://flagcdn.com/w320/sa.png",
    },
    // Group K
    {
      name: "Nigeria",
      code: "NGA",
      groupLetter: "K",
      confederation: "CAF",
      fifaRanking: 38,
      flagUrl: "https://flagcdn.com/w320/ng.png",
    },
    {
      name: "Algeria",
      code: "ALG",
      groupLetter: "K",
      confederation: "CAF",
      fifaRanking: 43,
      flagUrl: "https://flagcdn.com/w320/dz.png",
    },
    {
      name: "Cameroon",
      code: "CMR",
      groupLetter: "K",
      confederation: "CAF",
      fifaRanking: 51,
      flagUrl: "https://flagcdn.com/w320/cm.png",
    },
    {
      name: "Tunisia",
      code: "TUN",
      groupLetter: "K",
      confederation: "CAF",
      fifaRanking: 47,
      flagUrl: "https://flagcdn.com/w320/tn.png",
    },
    // Group L
    {
      name: "Norway",
      code: "NOR",
      groupLetter: "L",
      confederation: "UEFA",
      fifaRanking: 44,
      flagUrl: "https://flagcdn.com/w320/no.png",
    },
    {
      name: "Czech Republic",
      code: "CZE",
      groupLetter: "L",
      confederation: "UEFA",
      fifaRanking: 45,
      flagUrl: "https://flagcdn.com/w320/cz.png",
    },
    {
      name: "Qatar",
      code: "QAT",
      groupLetter: "L",
      confederation: "AFC",
      fifaRanking: 61,
      flagUrl: "https://flagcdn.com/w320/qa.png",
    },
    {
      name: "New Zealand",
      code: "NZL",
      groupLetter: "L",
      confederation: "OFC",
      fifaRanking: 94,
      flagUrl: "https://flagcdn.com/w320/nz.png",
    },
  ];
  await db.insert(teams).values(teamsList);
  console.log(`✅ Inserted ${teamsList.length} teams`);

  console.log("✨ Seed completed successfully!");
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
