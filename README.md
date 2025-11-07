## Running Yentic on the web
Go to www.yentic.com
If you want to update the code, push your updates and merge the pr here. Then visit above, it will update automatically within 5 minutes.


## 🚀 Setup and Updating Yentic Developer Edition (not reccomended)

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
npm run dev
```
