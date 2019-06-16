var express = require('express');
var router = express.Router();
var config = require('../config');
var fs = require('fs');
var path = require('path');
var {promisify} = require('util');
const lstat = promisify(fs.lstat);
const readdir = promisify(fs.readdir);
const exists = promisify(fs.exists);

/**
 * Get next image
 */
router.get('/', function(req, res, next) {
  fs.readdir(config.unlabeledImageDir, async (err, items) => {
    if (err) {
      throw err;
    }

    let index = 0;
    let urlPath = `/${config.unlabeledImageDirSuffix}/${items[index]}`;
    let defaultType = "";
    while (index < items.length){
      urlPath = `/${config.unlabeledImageDirSuffix}/${items[index]}`;
      if (urlPath.endsWith('.json')){
        index++;
        continue;
      }

      const stat = await lstat(`./${config.staticDir}` + urlPath);
      if (stat.isDirectory()) {
        defaultType = items[index];
        const images = (await readdir(`./${config.staticDir}` + urlPath))
          .filter(name=>!name.endsWith('.json'));
        if (images.length === 0){
          // Empty dir
          index++;
          continue;
        }

        let imageFilename = null;
        while (!imageFilename || imageFilename.endsWith('.json')){
          imageFilename = images[Math.floor(Math.random() * images.length)];
        }

        urlPath += '/' + imageFilename;
      }

      break;
    }

    if (items.length <= index){
      res.send('{"url": ""}');
      return;
    }

    if (await exists(`./${config.staticDir}` + urlPath + '.json')) {
      fs.readFile(`./${config.staticDir}` + urlPath + '.json', (err, data) => {
        let defaultBoxes = JSON.parse(data).boxes;
        res.send(JSON.stringify({
            url: urlPath,
            defaultType: defaultType,
            defaultBoxes
        }));
      })
    } else {
      res.send(JSON.stringify({
          url: urlPath,
          defaultType: defaultType
      }));
    }
  })
});

router.get('/image-num', (req, res, next) => {
  fs.readdir(config.unlabeledImageDir, async (err, items) => {
    if (err) {
      throw err;
    }

    let n = 0;
    for (let i = 0; i < items.length; i++){
      const stat = await lstat(path.join(config.unlabeledImageDir, items[i]));
      if (stat.isDirectory()){
        const files = await fs.readdir(path.join(config.unlabeledImageDir, items[i]));
        const filteredLength = files.filter(name=>{ 
          return !name.endsWith('.json');
        }).length;
        n += filteredLength;
      } else if (!items[i].endsWith('.json')) {
        n++;
      }
    }

    res.send(n.toString());
  })
});

/**
 * Post labeled data
 */
router.post('/', async function(req, res, next) {
  // req.body:
  // 
  // {
  //   image: this.image.src,
  //   height: this.image.naturalHeight,
  //   width: this.image.naturalWidth,
  //   flaws: [
  //     {
  //       x: 100,
  //       y: 100,
  //       w: 10,
  //       h: 10,
  //       annotation: 'Cylinder'
  //     }
  //   ]
  // }
  let url = req.body.image;
  url = decodeURI(url);
  const parts = url.split('/')
  const imageName = parts[parts.length - 1];
  let imagePath = path.join(config.unlabeledImageDir, imageName);
  if (!await exists(imagePath)){
    imagePath = path.join(config.unlabeledImageDir, parts[parts.length - 2], imageName);
  }

  const targetPath = path.join(config.targetDir, imageName);
  const labeledDataPath = path.join(config.targetDir, imageName + '.json');
  fs.rename(imagePath, targetPath, err=>{
    fs.exists(imagePath + '.json', (exists) => {
      if (exists){
        fs.unlink(imagePath + '.json', err=>console.error(err));
      }
    })
    if (err){
      // FIXME: This image may be labeled
      console.error(err);
      res.statusCode = 500;
      res.send(JSON.stringify({
        status: 500,
        error: "Server Error. The image doesnt exist."
      }))
      return;
    }

    fs.writeFile(labeledDataPath, JSON.stringify(req.body), err=>console.error(err));
    res.send(JSON.stringify({
      status: 200
    }))
  });
})

module.exports = router;
