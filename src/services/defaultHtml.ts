export const defaultHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, Arial, sans-serif;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(78, 140, 255, 0.22), transparent 36%),
          linear-gradient(180deg, #f7f9fd, #eef3fb);
        color: #162033;
      }

      main {
        width: min(720px, calc(100% - 48px));
        padding: 40px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.86);
        box-shadow: 0 24px 80px rgba(13, 28, 58, 0.14);
      }

      h1 {
        margin: 0 0 16px;
        font-size: clamp(2rem, 6vw, 3.25rem);
      }

      p {
        margin: 0 0 24px;
        line-height: 1.7;
        color: #44516a;
      }

      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      a {
        text-decoration: none;
        padding: 12px 18px;
        border-radius: 999px;
        font-weight: 600;
      }

      .primary {
        background: #2f65dd;
        color: #fff;
      }

      .secondary {
        background: #e8eefb;
        color: #27407d;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Edit AI-generated HTML faster</h1>
      <p>
        Open a local HTML file, tweak the markup in Monaco, and watch the preview update in real time.
        This starter document is here so the first launch already feels alive.
      </p>
      <div class="actions">
        <a class="primary" href="https://example.com">Primary action</a>
        <a class="secondary" href="https://example.com/docs">Secondary action</a>
      </div>
    </main>
  </body>
</html>
`
