import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',timeout:30000,use:{baseURL:'http://127.0.0.1:5173',headless:true,launchOptions:{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,args:['--no-sandbox']}},webServer:{command:'npm run dev -- --host 127.0.0.1',url:'http://127.0.0.1:5173',reuseExistingServer:false},workers:1});
