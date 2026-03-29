import "./globals.css";

export const metadata = {
  title: "Greenery",
  description: "Greenery operations dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
