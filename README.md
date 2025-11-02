## 🚀 Setup and Updating Yentic Developer Edition

To get started with Yentic (the web IDE project), follow these steps:

# Clone the repository
```bash

git clone https://github.com/iamaperson000/yentic.git
cd yentic
```


# Install dependencies
```bash
npm install
```

# Start the development server
```bash
npm run dev
```
# → Open http://localhost:3000 in your browser

# When you want to update your local copy to the latest version from GitHub
```bash
git fetch origin
git reset --hard origin/main
git clean -fd
npm install
npm run dev
```
