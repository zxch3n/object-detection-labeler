var express = require('express');
var router = express.Router();
var config = require('../config');
var fs = require('fs');
var path = require('path');

/**
 * Get next image
 */
router.get('/', function(req, res, next) {
  fs.readdir('./public/images/', (err, items) => {
    if (err) {
      throw err;
    }

    let index = 0;
    let urlPath = `/images/${items[index]}`;
    let defaultType = "";
    while (index < items.length){
      urlPath = `/images/${items[index]}`;
      if (urlPath.endsWith('.json')){
        index++;
        continue;
      }

      if (fs.lstatSync('./public' + urlPath).isDirectory()) {
        defaultType = items[index];
        const images = fs.readdirSync('./public' + urlPath)
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

    if (fs.existsSync('./public' + urlPath + '.json')) {
      fs.readFile('./public' + urlPath + '.json', (err, data) => {
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
  fs.readdir('./public/images/', (err, items) => {
    if (err) {
      throw err;
    }

    let n = 0;
    for (let i = 0; i < items.length; i++){
      if (fs.lstatSync('./public/images/' + items[i]).isDirectory()){
        n += fs.readdirSync('./public/images/' + items[i]).filter(name=>{ 
          return !name.endsWith('.json');
        }).length;
      } else {
        n++;
      }
    }

    res.send(n.toString());
  })
});

/**
 * Post labeled data
 */
router.post('/', function(req, res, next) {
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
  const parts = url.split('/')
  const imageName = parts[parts.length - 1];
  let imagePath = './public/images/' + imageName;
  if (!fs.existsSync(imagePath)){
    imagePath = './public/images/' + parts[parts.length - 2] + '/' + imageName;
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
