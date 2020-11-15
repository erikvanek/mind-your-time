chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "sampleContextMenu",
    title: "Sample Context Menu",
    contexts: ["selection"]
  });
});

//   chrome.webNavigation.onCompleted.addListener(function(par) {
// }, {url: [{urlMatches : 'https://www.google.com/'}]});

let lastKnownUrl;
let activeTabId;
// what should be the sensible default? browser launch?
let lastStop;
let lastStart;
const chunks = [];
running = false;

chrome.webNavigation.onTabReplaced.addListener(_ => {
  start();
});

chrome.runtime.onInstalled.addListener(installed => {
  start();
});

// this deals with tab change
chrome.tabs.onActivated.addListener(active => {
  chrome.tabs.get(active.tabId, tab => {
    lastKnownUrl = tab.url;
    activeTabId = active.tabId;
    if (running) {
      stop();
      logChunk(lastStart, lastStop);
    } else {
      lastStart = new Date().getTime();
      start();
    }
  });
});

chrome.webNavigation.onCommitted.addListener(details => {
  // console.log(`Commited: ${details.url}`);
  start();
});

// this deals with focus/unfocus
// chrome.windows.onFocusChanged.addListener(state => {
//   const active = state !== chrome.windows.WINDOW_ID_NONE;
//   const now = new Date().getTime();
//   if (!active) {
//     logChunk(lastStart, now);
//     lastStop = now;
//   } else {
//     lastStart = now;
//   }
// });

window.setInterval(mainLoop, 1000);

function setBadgeText() {
  // reset badge here
  const minutes = convertToMinutes(
    chunks
      .map(chunk => chunk.length)
      .reduce((accumulator, current) => accumulator + current, 0)
  );
  chrome.browserAction.setBadgeText({ text: minutes.toString() });
}

function mainLoop() {
  chrome.windows.getCurrent(function(browser) {
    const focused = browser.focused;
    if (focused) {
      if (!running) {
        start();
      } else {
        // now I have to fake add a slot to ensure 'real time' update
        // console.log('now running and need to add a fake slot')
        stop();
        logChunk(lastStart, lastStop);
        start();
      }
    } else {
      if (running) {
        stop();
        logChunk(lastStart, lastStop);
      }
    }
    logResults();
    setBadgeText();
  });
}

const logChunk = (start, end) => {
  if (lastKnownUrl && isLink(lastKnownUrl)) {
    const chunk = {
      start,
      end,
      url: lastKnownUrl,
      length: end - start
    };
    chunks.push(chunk);
  }
};

const isLink = url => url.startsWith("http") || url.startsWith("www");

const start = () => {
  lastStart = now();
  running = true;
};

const stop = () => {
  lastStop = now();
  running = false;
};

now = _ => new Date().getTime();

const logResults = () => {
  const reduced = chunks.reduce((accumulator, current) => {
    const domain = current.url.split("//")[1].split("/")[0];
    if (!accumulator.find(chunk => chunk.domain === domain)) {
      accumulator.push({
        domain,
        length: current.length,
        minutes: `${convertToMinutes(current.length)} mins`
      });
    } else {
      const index = accumulator.map(el => el.domain).indexOf(domain);
      const chunk = accumulator[index];
      accumulator[index] = {
        ...chunk,
        length: chunk.length + current.length,
        minutes: `${convertToMinutes(chunk.length + current.length)} mins`
      };
    }
    return accumulator;
  }, []);
  console.log(reduced);
};

const convertToMinutes = miliseconds =>
  Math.round((miliseconds / (1000 * 60)) * 10) / 10;
