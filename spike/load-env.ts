import { config as loadDotenv } from "dotenv";

loadDotenv({ quiet: true });
loadDotenv({ path: ".env.local", quiet: true });
