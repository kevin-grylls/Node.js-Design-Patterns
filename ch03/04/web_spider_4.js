const utilities = require("./utilities");
const TaskQueue = require("./taskQueue");
const downloadQueue = new TaskQueue(2);

// 스파이더 실행 with Custom Callback
function spiderLinks(currentUrl, body, nesting, callback) {
  if (nesting === 0) {
    return process.nextTick(callback);
  }

  const links = utilities.getPageLinks(currentUrl, body);

  if (links.length === 0) {
    return process.nextTick(callback);
  }

  let completed = 0,
    hasErrors = false;

  links.forEach(link => {
    downloadQueue.pushTask(done => {
      spiderLinks(link, nesting - 1, err => {
        if (err) {
          hasErrors = true;
          return callback(err);
        }

        if (++completed === links.length && !hasErrors) {
          // 모든 작업 완료 확인, 완료되었다면 콜백 호출
          callback();
        }

        // 작업 끝났을 시
        done();
      });
    });
  });
}
