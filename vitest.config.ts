// file: ./vitest.config.ts
import { defineConfig } from "vitest/config";
import { setup, teardown } from "./src/tests/setup";

export default defineConfig({
    test: {
        include: ["src/tests/*.test.{js,mjs,cjs,ts,jsx,tsx}"],
        globalSetup: ["./src/tests/setup.ts"],
        // reporters: ["default", { async onWatcherRerun() {
        //     await teardown();
        //     await setup();
        // }}]
    },
});