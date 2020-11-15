chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "sampleContextMenu",
    title: "Sample Context Menu",
    contexts: ["selection"]
  });
});

//   chrome.webNavigation.onCompleted.addListener(function(par) {
// }, {url: [{urlMatches : 'https://www.google.com/'}]});

const ACTIVE_STATE = 159;
const INACTIVE_STATE = -1;
// let running = false;
let lastUrl;
let activeTabId;
// what should be the sensible default? browser launch?
let lastStop;
let lastStart;
const chunks = [];

chrome.webNavigation.onTabReplaced.addListener(_ => {
  // console.log("tab replaced");
  start();
});

document.onvisibilitychange = function(par) {
  console.log("Visibility of page has changed!", par);
};

chrome.runtime.onInstalled.addListener(installed => {
  // console.log("installed");
  start();
});

// this deals with tab change
chrome.tabs.onActivated.addListener(active => {
  chrome.tabs.get(active.tabId, tab => {
    start();
    lastStart = new Date().getTime();
    lastUrl = tab.url;
    activeTabId = active.tabId;
  });
});

chrome.webNavigation.onCommitted.addListener(details => {
  // console.log(`Commited: ${details.url}`);
  start();
});

// this deals with focus/unfocus
chrome.windows.onFocusChanged.addListener(state => {
  const active = state !== chrome.windows.WINDOW_ID_NONE;
  const now = new Date().getTime();
  if (!active) {
    logChunk(lastStart, now);
    lastStop = now;
  } else {
    lastStart = now;
  }
});

window.setInterval(setBadgeText, 5000);

function setBadgeText() {
  // reset badge here
  const minutes = convertToMinutes(
    chunks
      .map(chunk => chunk.length)
      .reduce((accumulator, current) => accumulator + current, 0)
  );
  console.log(minutes);
  chrome.browserAction.setBadgeText({ text: minutes.toString() });
  // chrome.windows.getCurrent(function(browser){
  //   console.log(browser.focused)
  // })
}

const logChunk = (start, end) => {
  // console.log(lastUrl);
  if (lastUrl && isLink(lastUrl)) {
    const chunk = {
      start,
      end,
      url: lastUrl,
      length: end - start
    };
    chunks.push(chunk);
  }
};

const isLink = url => url.startsWith("http") || url.startsWith("www");

const start = () => {
  const when = new Date().getTime();
  logChunk(lastStart, when);
  lastStop = when;
  logResults();
  lastStart = when;
};

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
