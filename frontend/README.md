# tppr-frontend

This is the frontend, powered by `React` and `shadcn/ui`.

> [!INFO]
> All of this is done with AI. I meticulously checked and cleaned out any kinks, but I am not a frontend person...

## running

You will need the **bun** or **node** javascript runtimes to compile the frontend into a static website.

Currently, _tppr_ is configured so the backend deals with serving the website (which allows for templates)

### compiling

```bash
# from the repo root
npm install
npm run build
# or, with bun from this folder
bun install
bun run build
```

## running independently

the website can also be run independently:

```bash
# from the repo root
npm run dev
# or, with bun from this folder
bun run dev
```
