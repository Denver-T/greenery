import "./globals.css";

export const metadata = {
  title: "Greenery",
  description: "Greenery operations dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var theme = localStorage.getItem("greenery-theme");
                  var isDark = theme === "dark";
                  document.documentElement.classList.toggle("dark", isDark);
                  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
