/*
Called when the item has been created, or when creation failed due to an error.
We'll just log success/failure here.
*/
function onCreated() {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  } else {
    console.log("Item created successfully");
  }
}

/*
Create all the context menu items.
*/
browser.menus.create(
  {
    id: "upload-paste",
    title: browser.i18n.getMessage("uploadMenuItem"),
    contexts: ["link", "selection"],
  },
  onCreated
);

/*
The click event listener, where we perform the appropriate action given the
ID of the menu item that was clicked.
*/
browser.menus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case "upload-paste":
      const url = info.linkUrl || info.selectionText;
      console.log("log-selection clicked, uploading link to paste: " + url);
      const response = await uploadToPaste(url);
      if (response.status === "success") {
        // console.log("Upload successful, opening paste in new tab, upload response: ", response);
        // browser.tabs.create({
        //   url: "https://paste.gg/" + response.result.id,
        // });
        console.log("Upload successful, copying link to clipboard, upload response: ", response);
        navigator.clipboard.writeText("https://paste.gg/" + response.result.id);
      } else {
        console.log("Upload failed, showing error message", response);
        alert(`Extension error [${response.error}]: ${response.message}`);
      }
      break;
  }
});

/**
 * @typedef SuccessPostResponse
 * @property {"success"} status
 * @property {object} result
 * @property {string} result.id
 * There are more properties, but we don't need them
 */

/**
 * @typedef ErrorPostResponse
 * @property {"error"} status
 * @property {string} error 
 * @property {string | undefined} message
 */

const PASTE_API = "https://api.paste.gg/v1/";

/**
 * 
 * @param {string} url 
 * @returns {Promise<SuccessPostResponse | ErrorPostResponse>}
 */
async function uploadToPaste(url) {
  let fileContent;
  try {
    console.log("Fetching URL");
    fileContent = await fetch(url).then((r) => r.text());
  } catch (e) {
    console.log("Error fetching URL", e);
    return {
      status: "error",
      error: "extension_fetch_error",
      message: e?.message.toString() || e.toString() || "Unknown error",
    };
  }


  let pasteResponse;
  try {
    console.log("Uploading to paste.gg");
    pasteResponse = await fetch(PASTE_API + "pastes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visibility: "unlisted",
        files: [
          {
            name: new URL(url).pathname.split("/").pop(),
            content: {
              format: "text",
              value: fileContent,
            },
          },
        ],
      }),
    }).then((r) => r.json());
  } catch (e) {
    console.log("Error uploading to paste.gg", e);
    return {
      status: "error",
      error: "extension_paste_api_error",
      message: e?.message.toString() || e.toString() || "Unknown error",
    };
  }

  return pasteResponse;
}
