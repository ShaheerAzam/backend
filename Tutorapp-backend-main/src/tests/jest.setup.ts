// src/test/jest.setup.ts
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });
console.log("✅ Jest setup loaded. DB URI:", process.env.MONGO_URI);
