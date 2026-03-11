"use client";

import AppShell from "@/components/AppShell";
import { useState, useEffect } from "react";
import { getAllTask } from "@/lib/api/task";

export default function Page() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyTasks = async () => {
      try {
        const response = await getAllTask();
        setTasks(response.data || response);
        console.log(response.data);
      } catch (error) {
        console.error("Failed to load tasks:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTasks();
  }, []);
  return (
    <AppShell title="Request Forms">
      <section className="rounded-card bg-white p-6 shadow-soft">
        {loading ? <p>Loading...</p> : (
        <ul>
          {tasks.map(task => (
            <li key={task.id}>{task.title} - {task.status}</li>
          ))}
        </ul>
      )}
      </section>
    </AppShell>
  );
}