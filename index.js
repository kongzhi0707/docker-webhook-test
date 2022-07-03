
const http = require("http");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 递归删除目录
function deleteFolderRecursive(path) { 
  // fs.existsSync 以同步的方式检测目录是否存在
  if (fs.existsSync(path)) { 
    // fs.readdirSync 以同步读取给定的目录的内容
    fs.readdirSync(path).forEach(function (file) {
      const curPath = path + '/' + file;
      // 判断当前文件目录是否存在
      if (fs.statSync(curPath).isDirectory()) {
        // 如果存在，递归调用
        deleteFolderRecursive(curPath);
      } else {
        // 否则的话，删除文件
        fs.unlinkSync(curPath);
      }
    });
    // 同步删除给定路径下的目录
    fs.rmdirSync(path);
  }
}

const resolvePost = req =>
  new Promise(resolve => {
    let chunk = "";
    req.on("data", data => {
      chunk += data;
    });
    req.on("end", () => {
      resolve(JSON.parse(chunk));
    })
  });

http.createServer((req, res) => {
  console.log('receive request')
  console.log(req.url)
  if (req.method === 'POST' && req.url === '/') {
    const data = resolvePost(req);
    console.log('---req--data---', data);

    const projectDir = path.resolve(__dirname, `./${data.repository.name}`);
    deleteFolderRecursive(projectDir);

    // 拉取仓库最新的代码
    execSync(`git clone https://github.com/kongzhi0707/${data.repository.name}.git ${projectDir}`, {
      stdio: 'inherit',
    });

    // 复制 Dockerfile 到项目的目录
    fs.copyFileSync(path.resolve(__dirname, `./Dockerfile`), path.resolve(projectDir, './Dockerfile'));

    // 复制 .dockerignore 到项目的目录
    fs.copyFileSync(path.resolve(__dirname, `./.dockerignore`), path.resolve(projectDir, './.dockerignore'));

    // 创建 docker 镜像
    execSync(`docker build -t ${data.repository.name}-image:latest .`, {
      stdio: 'inherit',
      cwd: projectDir
    });

    // 销毁 docker 容器
    execSync(`docker ps -a -f "name=^${data.repository.name}-container" --format="{{.Names}}" | xargs -r docker stop | xargs -r docker rm`, {
      stdio: 'inherit',
    });

    // 创建 docker 容器
    execSync(`docker run -d -p 8888:80 --name ${data.repository.name}-container ${data.repository.name}-image:latest`, {
      stdio: 'inherit',
    });
    console.log('deploy success');
  }
  res.end('ok')
}).listen(3000, () => {
  console.log('server is ready')
});