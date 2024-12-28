/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { NextUIProvider } from "@nextui-org/react";
import { ThemeProvider } from "next-themes";
import { ActivityMonitor } from "./components/activity-monitor/ActivityMonitor";
import { ChatInterface } from "./components/chat-interface";
import { Sidebar } from "./components/sidebar";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (!API_KEY) throw new Error("set REACT_APP_GEMINI_API_KEY in .env");

const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

export function App() {
  return (
    <NextUIProvider>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 flex flex-col">
            <div className="flex-1 relative">
              <ChatInterface />
            </div>
            <ActivityMonitor />
          </main>
        </div>
      </ThemeProvider>
    </NextUIProvider>
  );
}

export default App;
