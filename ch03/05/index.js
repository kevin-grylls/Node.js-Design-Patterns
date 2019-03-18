"use strict";

const request = require("request");
const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");
const async = require("async");
const utilities = require("./utilities");

function spiderLinks(currentUrl, body, nesting, callback) {
  if (nesting === 0) {
    return process.nextTick(callback);
  }

  let links = utilities.getPageLinks(currentUrl, body);

  if (links.length === 0) {
    return process.nextTick(callback);
  }

  const completed = 0,
    hasErrors = false;

  links.forEach(function(link) {
    const taskData = { link: link, nesting: nesting };

    downloadQueue.push(taskData, err => {
      if (err) {
        hasErrors = true;
        return callback(err);
      }

      if (++completed === links.length && !hasErrors) {
        callback();
      }
    });
  });
}

const downloadQueue = async.queue((taskData, callback) => {
  spider(taskData.link, taskData.nesting - 1, callback);
}, 2);

function download(url, filename, callback) {
  console.log(`Downloading ${url}`);
  let body;

  async.series(
    [
      callback => {
        // [1]
        request(url, (err, response, responseBody) => {
          if (err) {
            return callback(err);
          }
          body = responseBody;
          callback();
        });
      },

      // [2]
      mkdirp.bind(null, path.dirname(filename)),

      callback => {
        // [3]
        fs.writeFile(filename, body, callback);
      }
    ],
    err => {
      // [4]
      if (err) {
        return callback(err);
      }

      console.log(`Download and saved: ${url}`);
      callback(null, body);
    }
  );
}

function spider(url, nesting, callback) {
  const filename = utilities.urlToFilename(url);

  fs.readFile(filename, "utf8", function(err, body) {
    if (err) {
      if (err.code !== "ENOENT") {
        return callback(err);
      }

      return download(url, filename, function(err, body) {
        if (err) {
          return callback(err);
        }

        spiderLinks(url, body, nesting, callback);
      });
    }

    spiderLinks(url, body, nesting, callback);
  });
}
