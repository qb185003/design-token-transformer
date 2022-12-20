const StyleDictionary = require('style-dictionary')
const deepmerge = require("deepmerge");
const fs = require('fs');
const path = require('path')

const jsonsInDir = fs.readdirSync('./tokens').filter(file => path.extname(file) === '.json');

function getStyleDictionaryConfig(theme) {
  return {
    "source": [`tokens/${theme}.json`],
    "platforms": {
      "scss": {
        "transformGroup": "custom/scss",
        "buildPath": "build/scss/",
        "files": [{
          "destination": `_${theme}-variables.scss`,
          "format": "scss/variables"
        }]
      },
      "less": {
        "transformGroup": "custom/less",
        "buildPath": "build/less/",
        "files": [{
          "destination": `_${theme}-variables.less`,
          "format": "less/variables"
        }]
      },
      "css": {
        "transformGroup": "custom/css",
        "buildPath": "build/css/",
        "files": [{
          "destination": `_${theme}-variables.css`,
          "format": "css/variables",
          "filter": "validToken",
          "options" : {
            "showFileHeader": false
          }
        }]
      },
      "json-flat": {
        "transformGroup": "js",
        "buildPath": "build/json/",
        "files": [
          {
            "destination": `${theme}.json`,
            "format": "json/flat"
          }
        ]
      },
      "ios": {
        "transformGroup": "ios",
        "buildPath": `build/ios/${theme}/`,
        "files": [{
          "destination": "StyleDictionaryColor.h",
          "format": "ios/colors.h",
          "className": "StyleDictionaryColor",
          "type": "StyleDictionaryColorName",
          "filter": {
            "type": "color"
          }
        },{
          "destination": "StyleDictionaryColor.m",
          "format": "ios/colors.m",
          "className": "StyleDictionaryColor",
          "type": "StyleDictionaryColorName",
          "filter": {
            "type": "color"
          }
        },{
          "destination": "StyleDictionarySize.h",
          "format": "ios/static.h",
          "className": "StyleDictionarySize",
          "type": "float",
          "filter": {
            "type": "number"
          }
        },{
          "destination": "StyleDictionarySize.m",
          "format": "ios/static.m",
          "className": "StyleDictionarySize",
          "type": "float",
          "filter": {
            "type": "number"
          }
        }]
      },
      "ios-swift": {
        "transformGroup": "ios-swift",
        "buildPath": `build/ios-swift/${theme}/`,
        "files": [{
          "destination": "StyleDictionary.swift",
          "format": "ios-swift/class.swift",
          "className": "StyleDictionary",
          "filter": {}
        }]
      },
      "ios-swift-separate-enums": {
        "transformGroup": "ios-swift-separate",
        "buildPath": "build/ios-swift/",
        "files": [{
          "destination": "StyleDictionaryColor.swift",
          "format": "ios-swift/enum.swift",
          "className": "StyleDictionaryColor",
          "filter": {
            "type": "color"
          }
        },{
          "destination": "StyleDictionarySize.swift",
          "format": "ios-swift/enum.swift",
          "className": "StyleDictionarySize",
          "type": "float",
          "filter": {
            "type": "number"
          }
        }]
      }
    }
  }
}


StyleDictionary.registerTransform({
  name: 'size/px',
  type: 'value',
  matcher: token => {
    return (token.unit === 'pixel' || token.type === 'dimension') && token.value !== 0
  },
  transformer: token => {
    return `${token.value}px`
  }
})



// Custom NCR format
const THEME_NAME_VARIABLE = "FONTTHEMENAMEVARIABLE";
StyleDictionary.registerFormat({
  name: 'json/flat',
  formatter: function(dictionary) {

    const originalProperties = dictionary.allProperties;

    // Find the THEME NAME VARIABLE from Figma file, where the description is used for the theme name
    const themeVar = originalProperties.find(p => p.name.toUpperCase() === THEME_NAME_VARIABLE);
    const themeName = themeVar.description;

    let propertiesToUse = {
      [themeName]: {}
    };

    originalProperties.map(property => {
      const { value, attributes } = property;

      // Skip the theme name variable
      if (property.name.toUpperCase() === THEME_NAME_VARIABLE) {
        return null;
      }


      // Modify "color" to be palette for MUI
      if (attributes.category === 'color') {
        propertiesToUse = deepmerge(propertiesToUse, {
          [themeName]: {
            palette: {
              [attributes.type]: {
                [attributes.item]: value
              }
            }
          }
        });
      } else if (attributes.category === 'font') {
        // If we keep attributes.type in like above, it will
        // come out typography.typography, nested, so we remove
        propertiesToUse = deepmerge(propertiesToUse, {
          [themeName]: {
            typography: {
              [attributes.item]: value
            }
          }
        });
      } else if (attributes.category === 'typography' || attributes.category === 'components' ||
          attributes.category === 'grid' || attributes.category === 'effect') {
        // Skip these categories intentionally
        // They shouldn't be exported from figma, but just in case
      } else {
        propertiesToUse = deepmerge(propertiesToUse, {
          [themeName]: {
            [attributes.category]: {
              [attributes.type]: {
                [attributes.item]: value
              }
            }
          }
        });
      }
    })

    return JSON.stringify(propertiesToUse, null, 2);
  }
});

StyleDictionary.registerTransform({
  type: 'value',
  name: 'size/percent',
  matcher: token => {
    return token.unit === 'percent' && token.value !== 0
  },
  transformer: token => {
    return `${token.value}%`
  }
})


StyleDictionary.registerTransformGroup({
  name: 'custom/css',
  transforms: StyleDictionary.transformGroup['css'].concat([
    'size/px',
    'size/percent'
  ])
})

StyleDictionary.registerTransformGroup({
  name: 'custom/less',
  transforms: StyleDictionary.transformGroup['less'].concat([
    'size/px',
    'size/percent'
  ])
})

StyleDictionary.registerTransformGroup({
  name: 'custom/scss',
  transforms: StyleDictionary.transformGroup['less'].concat([
    'size/px',
    'size/percent'
  ])
})

StyleDictionary.registerFilter({
  name: 'validToken',
  matcher: function(token) {
    return ['dimension', 'string', 'number', 'color'].includes(token.type)
  }
})



StyleDictionary.registerFilter({
  name: 'validToken',
  matcher: function(token) {
    return ['dimension', 'string', 'number', 'color'].includes(token.type)
  }
})



jsonsInDir.map(file => {
  const theme = file.slice(0, -5);
  const StyleDictionaryExtended = StyleDictionary.extend(getStyleDictionaryConfig(theme))
  StyleDictionaryExtended.buildAllPlatforms()
})