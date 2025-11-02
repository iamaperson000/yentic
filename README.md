## 🚀 Setup and Updating Yentic

To get started with Yentic (the web IDE project), follow these steps:

# Clone the repository
```bash

git clone https://github.com/iamaperson000/yentic.git
cd yentic
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
# → Open http://localhost:3000 in your browser

# When you want to update your local copy to the latest version from GitHub
git fetch origin
git reset --hard origin/main
git clean -fd
npm install
npm run dev
