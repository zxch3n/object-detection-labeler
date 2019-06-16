var config = {}
config.targetDir = './labeledData'
config.staticDir = 'public'
config.unlabeledImageDirSuffix = 'images'
config.unlabeledImageDir = `./${config.staticDir}/${config.unlabeledImageDirSuffix}` // Must be inside of staticDir 

module.exports = config;
