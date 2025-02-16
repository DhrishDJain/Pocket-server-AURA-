var connction = new WebSocket("ws://" + location.hostname + ":81/");
let files_on_server = {};
var dir = [];
let icon = {};

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("mainsearchinput");
  const sidenavsearchInput = document.querySelector(".sidenavsearch");
  const suggestionsContainer = document.getElementById("suggestions");
  const searcheditemcard = document.querySelector(".card");
  var filepathpart = document.querySelector(".filepathpart");
  let itemcontainer = document.querySelector(".item-container");
  let finalpath = "";

  document.querySelector(".sidesearchicon").addEventListener("click", () => {
    sidenavsearchInput.focus();
    document.querySelector(".sidesearchicon").classList.add("hidden");
    document.querySelector(".side_close_search").classList.remove("hidden");
  });
  document.querySelector(".side_close_search").addEventListener("click", () => {
    document.querySelector(".side_close_search").classList.add("hidden");
    document.querySelector(".sidesearchicon").classList.remove("hidden");
    sidenavsearchInput.value = "";
    document.querySelector(".typeheader").textContent = "Type";
    document.querySelector(".typeheader").style.minWidth = "";
    document.querySelector(".dateheader").style.minWidth = "";
    populate_side();
  });
  sidenavsearchInput.addEventListener("focus", () => {
    document.querySelector(".sidesearchicon").classList.add("hidden");
    document.querySelector(".side_close_search").classList.remove("hidden");
  });
  sidenavsearchInput.addEventListener("click", () => {
    const sidenavfolder = document.querySelector(".sidefolder");
    const folders = Object.keys(files_on_server);

    sidenavsearchInput.addEventListener("input", function () {
      // Example keys
      const query = this.value.toLowerCase();
      while (document.querySelector(".folder-list").children.length > 1) {
        document
          .querySelector(".folder-list")
          .removeChild(document.querySelector(".folder-list").lastChild);
      }
      if (query) {
        const filteredSuggestions = folders.filter((folder) =>
          folder
            .split("/")
            [folder.split("/").length - 2].toLowerCase()
            .includes(query)
        );
        filteredSuggestions.forEach((key) => {
          let newsidefolder = sidenavfolder.cloneNode(true);
          newsidefolder.classList.remove("hidden");
          let folderName = key.split("/")[key.split("/").length - 2];
          let folderExists = Array.from(
            document.querySelectorAll(".foldername")
          ).some((el) => el.textContent === folderName);
          if (folderExists) {
            folderName =
              key.split("/")[key.split("/").length - 3] + "/" + folderName;
          }
          newsidefolder.querySelector(".foldername").textContent = folderName;
          newsidefolder.addEventListener("click", () => {
            show_file_in_dir(key);
            processPaths(key);
          });
          console.log(newsidefolder);
          document.querySelector(".folder-list").appendChild(newsidefolder);
        });
      } else {
        populate_side();
      }
    });
  });
  //main search event
  document.querySelector(".searchicon").addEventListener("click", () => {
    searchInput.focus();
    document.querySelector(".searchicon").classList.add("hidden");
    document.querySelector(".close_search_div").classList.remove("hidden");
  });
  document.getElementById("close_search_div").addEventListener("click", () => {
    document.querySelector(".close_search").classList.add("hidden");
    document.querySelector(".searchicon").classList.remove("hidden");
    searchInput.value = "";
    document.querySelector(".typeheader").textContent = "Type";
    document.querySelector(".typeheader").style.minWidth = "";
    document.querySelector(".dateheader").style.minWidth = "";
    show_file_in_dir(finalpath);
  });
  searchInput.addEventListener("focus", () => {
    document.querySelector(".searchicon").classList.add("hidden");
    document.querySelector(".close_search").classList.remove("hidden");
  });
  document.addEventListener("click", function (event) {
    if (!document.querySelector(".suggestions").contains(event.target)) {
      document.querySelector(".suggestions").classList.add("hidden");
    }
  });

  searchInput.addEventListener("click", () => {
    const itemList = document.querySelector(".item-container");
    const elements = document
      .querySelector(".mobilepath")
      .querySelectorAll(".filepathpart");
    // find file path
    finalpath = "";
    for (let i = 0; i < elements.length; i++) {
      finalpath += elements[i].children[1].textContent.replace(/\s/g, "");
      finalpath += "/";
    }
    if (finalpath.length == 0) {
      finalpath = "/";
    }
    let items = extractFilenames(files_on_server[finalpath]);
    async function extractFilenames(data) {
      const filenames = [];
      async function traverse(obj, currentFolder = "") {
        const promises = [];

        for (let i = 0; i < obj.length; i++) {
          if (obj[i].filename) {
            const fullPath = currentFolder + obj[i].filename + "_" + i;
            filenames.push(fullPath);
          } else if (obj[i].folder) {
            const newFolder = obj[i].folder + "/";
            const promise = traverse(
              files_on_server[obj[i].folder + "/"],
              newFolder
            );
            promises.push(promise);
          }
        }

        await Promise.all(promises);
      }

      traverse(data, finalpath).then(() => {
        items = filenames;
        return filenames;
      });
    }
    searchInput.addEventListener("input", function () {
      const query = this.value.toLowerCase();
      document.querySelector(".suggestions").classList.remove("hidden");
      document.querySelector(".typeheader").textContent = "Location";
      document.querySelector(".typeheader").style.minWidth = "18.5%";
      document.querySelector(".dateheader").style.minWidth = "17.1%";
      suggestionsContainer.innerHTML = "";
      Array.from(Array.from(itemList.children).slice(2)).forEach((item) => {
        item.classList.remove("hidden");
      });

      if (query) {
        const filteredSuggestions = items.filter((item) =>
          item.toLowerCase().includes(query)
        );
        while (document.querySelector(".item-container").children.length > 2) {
          document
            .querySelector(".item-container")
            .removeChild(document.querySelector(".item-container").lastChild);
        }

        if (filteredSuggestions.length) {
          filteredSuggestions.forEach((suggestion) => {
            const suggestionItem = document.createElement("span");
            let newsearcheditemcard = searcheditemcard.cloneNode(true);
            let path = suggestion.split("/");
            path.pop();
            newsearcheditemcard.classList.remove("hidden");
            newsearcheditemcard.classList.add("searchitemcard");
            newsearcheditemcard.removeChild(
              newsearcheditemcard.lastElementChild
            );
            let suggestiondata =
              files_on_server[path.join("/") + "/"][
                parseInt(suggestion.split("_").pop())
              ];
            let name = `${suggestiondata.filename.split("#")[0]}.${
              suggestiondata.filename.split("#")[1]
            }`;
            suggestionItem.classList.add("suggestion-item");
            suggestionItem.textContent = name;
            suggestionItem.addEventListener("click", function (event) {
              searchInput.value = name;
              suggestionsContainer.classList.add("hidden");
              suggestionselected = true;
              Array.from(
                document.querySelector(".item-container").children
              ).forEach((item) => {
                if (item.querySelector(".filename").textContent !== name) {
                  item.classList.add("hidden");
                }
              });
            });
            suggestionsContainer.appendChild(suggestionItem);
            newsearcheditemcard.querySelector(".filename").textContent = name;
            if (suggestiondata.modified_date) {
              newsearcheditemcard.querySelector(".dateofmodi").textContent =
                suggestiondata.modified_date;
              newsearcheditemcard.querySelector(".size").textContent =
                file_size_conversion(suggestiondata.size);
            }
            newsearcheditemcard.querySelector(".filetype").textContent =
              path.join("/") + "/" + name;
            newsearcheditemcard.querySelector(".filetype").style.textWrap =
              "nowrap";
            newsearcheditemcard.querySelector(".filetype").style.maxWidth =
              "10rem";
            newsearcheditemcard.querySelector(".filetype").style.minWidth =
              "5rem";
            newsearcheditemcard.querySelector(".filetype").style.overflowX =
              "scroll";
            if (
              icon[suggestion.replace(/.*\//, "").split("#")[1]] != undefined
            ) {
              newsearcheditemcard.querySelector(".icon").innerHTML =
                icon[suggestion.replace(/.*\//, "").split("#")[1]];
            }
            newsearcheditemcard.addEventListener("click", () => {
              document.querySelector(".close_search").classList.add("hidden");
              document.querySelector(".searchicon").classList.remove("hidden");
              searchInput.value = "";
              document.querySelector(".typeheader").textContent = "Type";
              document.querySelector(".typeheader").style.minWidth = "";
              document.querySelector(".dateheader").style.minWidth = "";
              show_file_in_dir(path.join("/") + "/");
              const itemContainer = document.querySelector(".item-container");

              document.querySelectorAll(".card").forEach((card) => {
                const filenameElement = card.querySelector(".filename");
                if (
                  filenameElement &&
                  filenameElement.textContent.trim() === name
                ) {
                  const cardTopPosition = card.offsetTop;
                  itemContainer.scrollTop = cardTopPosition;
                  card.style.background = "var(--accent1)";
                  card.style.transition = "background 0.5s ease"; // Add transition for fade-out effect
                  card.style.borderRadius = "0.25rem"; // Add transition for fade-out effect

                  setTimeout(() => {
                    card.style.background = ""; // This will trigger the fade-out effect
                  }, 500);
                }
              });
              processPaths(path.join("/"));
            });
            itemcontainer.appendChild(newsearcheditemcard);
          });
        } else {
          suggestionsContainer.innerHTML =
            " <span class='nofile'>No result found</span>";
        }
      } else {
        show_file_in_dir(finalpath);
        suggestionsContainer.classList.add("hidden");
      }
    });
  });
});
connction.onopen = () => {
  console.log("WebSocket connection established");
  connction.send(
    JSON.stringify({
      action: "sendJson",
      path: "/",
    })
  );
};
fetch("/icons.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  })
  .then((data) => {
    icon = data;
  })
  .catch((error) => {
    console.error("There was a problem with the fetch operation:", error);
  });

connction.onmessage = (event) => {
  if (event.data == " " || event.data == undefined) {
    console.log("Received an empty or undefined data");
    return;
  }

  const tempobj = JSON.parse(event.data);
  console.log("Received data from WebSocket:", tempobj);

  const firstKey = Object.keys(tempobj)[0];
  if (firstKey === "/") {
    files_on_server = tempobj;
    list_dir_in_json();
  } else {
    const dirName = firstKey;
    const fileData = tempobj[firstKey];
    if (fileData !== undefined) {
      files_on_server[dirName] = fileData;
    } else {
      console.warn(`No existing data for key: ${firstKey}`);
    }
    if (Object.keys(tempobj).length >= 2) {
      for (i = 1; i < Object.keys(tempobj).length; i++) {
        files_on_server[Object.keys(tempobj)[i]] =
          tempobj[Object.keys(tempobj)[i]];
      }
    }
    show_file_in_dir(firstKey);
  }
  console.log("Updated object:", files_on_server);
};

function processPaths(rawpath) {
  let path = rawpath.split("/");
  var filepathpart = document.querySelector(".filepathpart");

  document.querySelectorAll(".path").forEach((path) => {
    while (path.children.length > 2) {
      path.removeChild(path.lastChild);
    }
  });
  path.forEach((pathpart) => {
    if (pathpart.length > 1) {
      var newfilepathpart = filepathpart.cloneNode(true);
      newfilepathpart.classList.remove("hidden");
      newfilepathpart.children[1].children[0].textContent = pathpart.trim();
      document.querySelectorAll(".path").forEach((path) => {
        path.appendChild(newfilepathpart.cloneNode(true));
      });
      document.querySelector(".openfolder").children[1].textContent = pathpart;
    }
  });
}
function populate_side() {
  let folder_list = document.querySelector(".folder-list");
  var sidemenufolder = document.querySelector(".sidefolder");
  while (folder_list.children.length > 1) {
    folder_list.removeChild(folder_list.lastChild);
  }
  const folders = Object.keys(files_on_server);
  folders.forEach((folder, index) => {
    if (index === 0) return;
    var newsidemenufolder = sidemenufolder.cloneNode(true);
    newsidemenufolder.classList.remove("hidden");

    let folderName = folder.split("/")[folder.split("/").length - 2];
    let folderExists = Array.from(
      document.querySelectorAll(".foldername")
    ).some((el) => el.textContent === folderName);
    if (folderExists) {
      folderName =
        folder.split("/")[folder.split("/").length - 3] + "/" + folderName;
    }

    newsidemenufolder.querySelector(".foldername").textContent = folderName;
    newsidemenufolder.querySelector(".noofitem").textContent =
      files_on_server[folder].length + " items";

    newsidemenufolder.addEventListener("click", function (event) {
      event.stopPropagation();
      show_file_in_dir(folder);
      processPaths(folder);
    });
    folder_list.appendChild(newsidemenufolder);
  });
}

function list_dir_in_json() {
  for (var x in files_on_server) {
    dir.push(x);
  }
  show_file_in_dir(dir[0]);
}
function show_file_in_dir(dir) {
  var item = document.querySelector(".card");
  var folder = document.querySelector(".folder");
  var filepathpart = document.querySelector(".filepathpart");

  while (document.querySelector(".item-container").children.length > 2) {
    document
      .querySelector(".item-container")
      .removeChild(document.querySelector(".item-container").lastChild);
  }

  for (let i = 0; i < files_on_server[dir].length; i++) {
    var newitem = item.cloneNode(true);
    if (Object.keys(files_on_server[dir][i])[0] == "folder") {
      var newfolder = folder.cloneNode(true);
      var newfilepathpart = filepathpart.cloneNode(true);
      newfolder.classList.remove("hidden");

      newfilepathpart.classList.remove("hidden");
      newfolder.querySelector(".filename").textContent = files_on_server[dir][
        i
      ]["folder"].replace(/.*\//, "");
      for (let j = 0; j < 4; j++) {
        if (newfolder.children[j]) {
          newfolder.children[j].addEventListener("click", function (event) {
            event.stopPropagation();
            const fullFolderPath = files_on_server[dir][i]["folder"].trim();
            show_file_in_dir(fullFolderPath + "/");
            processPaths(fullFolderPath + "/");
          });
        }
      }

      document.querySelector(".item-container").appendChild(newfolder);
    } else {
      newitem.classList.remove("hidden");
      var fileExtension = files_on_server[dir][i]["extension"];
      const filename = files_on_server[dir][i]["filename"];
      newitem.querySelector(".filename").textContent = filename.includes("#")
        ? `${filename.split("#")[0]}.${fileExtension}`
        : filename;
      newitem.querySelector(".size").textContent = file_size_conversion(
        files_on_server[dir][i]["size"]
      );

      // Extract the file extension
      newitem.querySelector(".dateofmodi").textContent =
        files_on_server[dir][i]["modified_date"];
      const iconDiv = newitem.querySelector(".icon");
      if (icon[fileExtension] != undefined) {
        iconDiv.innerHTML = icon[fileExtension];
      }
      newitem.querySelector(".filetype").textContent = fileExtension + " File";

      document.querySelector(".item-container").appendChild(newitem);
    }
  }

  if (dir == "/") {
    populate_side();
  }
  const itemContainer = document.querySelector(".item-container");
  const optiondropdown = document.querySelectorAll(".option-dropdown");
  const optionContents = document.querySelectorAll(".option-content");
  document.querySelectorAll(".option-dropdown button").forEach((op, index) => {
    op.addEventListener("click", function (event) {
      const optionContent = optionContents[index];
      document.addEventListener("click", function (event) {
        if (!optiondropdown[index].contains(event.target)) {
          optionContent.classList.add("hidden");
          optionContent.querySelector(".moveto").classList.add("hidden");
          if (
            !optionContent.parentNode.parentNode.classList.contains("folder")
          ) {
            optionContent.querySelector(".details").classList.add("hidden");
          }
          while (
            optionContent.querySelector(".movingpath").children.length > 3
          ) {
            optionContent
              .querySelector(".movingpath")
              .removeChild(
                optionContent.querySelector(".movingpath").lastChild
              );
          }
          if (
            event.target.classList.contains("option") &&
            event.target.textContent.trim() == "Move"
          ) {
            fillmovetodir("/");
          }
        }
        if (!document.querySelector(".suggestions").contains(event.target)) {
          document.querySelector(".suggestions").classList.add("hidden");
        }
      });
      optionContents.forEach((content) => {
        if (content != optionContent) {
          content.classList.add("hidden");
        }
      });
      optionContent.classList.toggle("hidden");
      // Function to check overflow and adjust position
      const rect = optionContent.getBoundingClientRect();
      const containerRect = itemContainer.getBoundingClientRect();
      const containerStyle = window.getComputedStyle(itemContainer);
      const containerPaddingBottom = parseFloat(containerStyle.paddingBottom);

      // Calculate the overflow amount
      const overflowAmount =
        rect.bottom - (containerRect.bottom - containerPaddingBottom);

      if (overflowAmount > 0) {
        optionContent.style.top = `-${overflowAmount}px`; // Move up by the overflow amount
      } else {
        optionContent.style.top = "2rem";
      }
    });
  });
  fillmovetodir("/");
}
function file_size_conversion(bytes) {
  if (bytes < 0) {
    return "Invalid size";
  } else if (bytes === 0) {
    return "0 B";
  }
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, unit)).toFixed(2);
  return `${size} ${sizes[unit]}`;
}

function file_operation(element, isfolder = false) {
  let action = element.textContent.trim();
  let file_action_param;
  let parentElement = element.parentNode.parentNode.parentNode;
  const elements = document
    .querySelector(".mobilepath")
    .querySelectorAll(".filepathpart");
  let finalpath = "";
  // find file path
  for (let i = 0; i < elements.length; i++) {
    finalpath += elements[i].children[1].textContent.replace(/\s/g, "");
    finalpath += "/";
  }
  if (elements.length == 0) {
    finalpath = "/";
  }
  var filename;
  if (!isfolder) {
    filename =
      finalpath +
      parentElement.querySelector(".filename").textContent.split(".")[0] +
      "#" +
      parentElement.querySelector(".filename").textContent.split(".").pop() +
      "#" +
      ".zip";
  } else {
    filename = finalpath + parentElement.querySelector(".filename").textContent;
  }
  if (action === "Move") {
    const moveto = parentElement.querySelector(".moveto");
    if (!parentElement.querySelector(".details").classList.contains("hidden")) {
      parentElement.querySelector(".details").classList.add("hidden");
    }
    moveto.classList.toggle("hidden");
  } else if (action === "Details") {
    if (!parentElement.querySelector(".moveto").classList.contains("hidden")) {
      parentElement.querySelector(".moveto").classList.add("hidden");
    }
    const details = parentElement.querySelector(".details");
    details.classList.toggle("hidden");
    var index;
    var orifilename =
      parentElement.querySelector(".filename").textContent.split(".")[0] +
      "#" +
      parentElement.querySelector(".filename").textContent.split(".").pop() +
      "#" +
      ".zip";
    for (let i = 0; i < files_on_server[finalpath].length; i++) {
      if (
        Object.keys(files_on_server[finalpath][i])[0] == "filename" &&
        files_on_server[finalpath][i]["filename"] == orifilename
      ) {
        index = i;
      }
    }
    details.querySelector(".detailtype").textContent =
      files_on_server[finalpath][index]["extension"];
    details.querySelector(".detailsize").textContent = file_size_conversion(
      files_on_server[finalpath][index]["size"]
    );
    details.querySelector(".detailloc").textContent =
      finalpath + parentElement.querySelector(".filename").textContent;
    details.querySelector(".detailloc").addEventListener("mouseleave", () => {
      details.querySelector(".detailloc").scrollLeft = 0;
    });
    details.querySelector(".detailmoddate").textContent =
      files_on_server[finalpath][index]["modified_date"];
    details.querySelector(".detailcreatedate").textContent =
      files_on_server[finalpath][index]["creation_date"];
  } else if (action === "Rename") {
    // set compelet file path
    if (
      !parentElement.querySelector(".moveto").classList.contains("hidden") ||
      !parentElement.querySelector(".details").classList.contains("hidden")
    ) {
      parentElement.querySelector(".moveto").classList.add("hidden");
      parentElement.querySelector(".details").classList.add("hidden");
    }
    parentElement.querySelector(".filename").classList.add("hidden");
    const renameto = document.createElement("input");
    renameto.type = "text";
    renameto.value = parentElement.querySelector(".filename").textContent;
    renameto.spellcheck = false;
    renameto.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        if (!isfolder) {
          file_action_param =
            finalpath +
            renameto.value.split(".")[0] +
            "#" +
            parentElement
              .querySelector(".filename")
              .textContent.split(".")
              .pop() +
            "#" +
            ".zip";
        } else {
          file_action_param = finalpath + renameto.value;
        }
        connction.send(
          JSON.stringify({
            action: action,
            folder_path: finalpath,
            file_action_parameter: file_action_param,
            path: filename,
          })
        );
        renameto.remove();
        parentElement.querySelector(".filename").classList.remove("hidden");
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        renameto.remove();
        parentElement.querySelector(".filename").classList.remove("hidden");
      }
    });
    document.addEventListener("mouseup", function (event) {
      if (!renameto.contains(event.target)) {
        renameto.remove();
        parentElement.querySelector(".filename").classList.remove("hidden");
      }
    });
    parentElement.insertBefore(
      renameto,
      parentElement.querySelector(".dateofmodi")
    );
    renameto.select();
  } else if (action === "Download" && !isfolder) {
    parentElement.querySelector(".option-content").classList.add("hidden");
    document.querySelector(".uploadStatus").classList.remove("hidden");
    document.querySelector(".cancel").classList.remove("hidden");
    document.querySelector(".uploading").classList.remove("hidden");
    document.querySelector(".processname").textContent = "DOWNLOADING";

    const fileName = parentElement.querySelector(".filename").textContent;
    const elements = document
      .querySelector(".mobilepath")
      .querySelectorAll(".filepathpart");
    finalpath = "";
    for (let i = 0; i < elements.length; i++) {
      finalpath += elements[i].children[1].textContent.replace(/\s/g, "");
      finalpath += "/";
    }
    if (finalpath.length == 0) {
      finalpath = "/";
    }
    const filename =
      finalpath +
      fileName.split(".")[0] +
      "#" +
      fileName.split(".").pop() +
      "#" +
      ".zip";
    const url = `http://192.168.4.1/download?file=${encodeURIComponent(
      filename
    )}`; // Change IP if needed

    // Create a new XMLHttpRequest
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob"; // Expect a binary file
    const bars = document.querySelectorAll(".bar");

    bars.forEach((bar) => {
      bar.classList.add("hidden");
    });
    document.querySelector(".uploadname").innerHTML = fileName;

    // Variables to calculate upload speed
    let startTime = Date.now();
    let uploadedBytes = 0;

    // Start upload
    xhr.onprogress = function (event) {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        document.querySelector(".chunkedsend").innerHTML = file_size_conversion(
          event.loaded
        );
        document.querySelector(
          ".uploadPercentage"
        ).innerText = `${percentage}%`;
        bars.forEach((bar, index) => {
          if (index < percentage / 10 && index != 9) {
            bar.classList.remove("hidden");
          }
        });
        // Calculate upload speed
        const currentTime = Date.now();
        const timeElapsed = (currentTime - startTime) / 1000; // in seconds
        uploadedBytes = event.loaded; // total uploaded bytes
        const speed = uploadedBytes / timeElapsed; // bytes per second
        const speedInKB = (speed / 1024).toFixed(2); // convert to KB/s
        document.querySelector(".speed").innerText = `${speedInKB} KB/s`;
      }
    };

    // Handle download completion
    xhr.onload = function () {
      if (xhr.status === 200) {
        bars[9].classList.remove("hidden");
        document.querySelector(".uploadPercentage").innerText = `100%`;
        document.querySelector(".speed").innerText = `0KB/s`;
        document.querySelector(".uploading").classList.add("hidden");

        document
          .querySelector(".downloadsuccessindication")
          .classList.remove("hidden");
        setTimeout(() => {
          document.querySelector(".cancel").classList.add("hidden");
          document
            .querySelector(".downloadsuccessindication")
            .classList.add("hidden");
          document.querySelector(".uploading").classList.remove("hidden");
          document.querySelector(".uploadStatus").classList.add("hidden");
        }, 2000);
        const arrayBuffer = xhr.response;
        const zip = new JSZip();
        zip.loadAsync(arrayBuffer).then((zip) => {
          Object.keys(zip.files).forEach((filename) => {
            zip.files[filename].async("blob").then((fileData) => {
              const link = document.createElement("a");
              link.href = URL.createObjectURL(fileData);
              link.download = filename; // Set the filename for download
              document.body.appendChild(link); // Append the link to the body
              link.click(); // Programmatically click the link to trigger the download
              link.remove();
            });
          });
        });
      } else {
        document.getElementById("message").innerText =
          "Error downloading file.";
      }
    };

    // Handle errors
    xhr.onerror = function () {
      console.error("Request failed.");
      document.getElementById("message").innerText = "Download failed!";
    };
    document.querySelector(".cancel").onclick = function () {
      xhr.abort(); // Cancel the download
      console.log("Download canceled.");
      document.querySelector(".uploading").classList.add("hidden");
      document.querySelector(".cancelindication").textContent =
        "Download Cancled";
      document.querySelector(".cancelindication").classList.remove("hidden");
      setTimeout(() => {
        document.querySelector(".uploadStatus").classList.add("hidden");
        document.querySelector(".cancel").classList.add("hidden");
        document.querySelector(".cancelindication").classList.add("hidden");
      }, 2000);
    };
    xhr.send();
  } else {
    connction.send(
      JSON.stringify({
        action: action,
        folder_path: finalpath,
        path: filename,
      })
    );
  }
}

async function createdir(foldername) {
  const elements = document
    .querySelector(".mobilepath")
    .querySelectorAll(".filepathpart");
  let finalpath = "";
  // find file path
  for (let i = 0; i < elements.length; i++) {
    finalpath += elements[i].children[1].textContent.replace(/\s/g, "");
    finalpath += "/";
  }
  if (finalpath.length == 0) {
    finalpath = "/";
  }

  connction.send(
    JSON.stringify({
      action: "Create_Folder",
      folder_path: finalpath,
      path: finalpath + foldername,
    })
  );
}

function fillmovetodir(dir) {
  var movetofolder = document.querySelector(".movetofolder");
  var folders = document.querySelectorAll(".folders");
  var movetofilepathpart = document.querySelector(".movetofilepathpart");
  folders.forEach((folder) => {
    while (folder.children.length > 1) {
      folder.removeChild(folder.lastChild);
    }

    for (let i = 0; i < files_on_server[dir].length; i++) {
      if ("folder" in files_on_server[dir][i]) {
        var newmovetofolder = movetofolder.cloneNode(true);
        var newmovetofilepathpart = movetofilepathpart.cloneNode(true);

        newmovetofilepathpart.classList.remove("hidden");
        newmovetofolder.classList.remove("hidden");
        newmovetofolder.querySelector(".movetofoldername").textContent =
          files_on_server[dir][i]["folder"].trim().replace(/.*\//, "");
        newmovetofolder.addEventListener("click", function (event) {
          event.stopPropagation();
          const fullFolderPath = files_on_server[dir][i]["folder"].trim();
          fillmovetodir(fullFolderPath + "/");
          newmovetofilepathpart.querySelector(".current-loc").textContent =
            fullFolderPath.replace(/.*\//, "");
          folder.parentNode
            .querySelector(".movingpath")
            .appendChild(newmovetofilepathpart);
        });
        folder.appendChild(newmovetofolder);
      }
    }

    const movetobackButton = folder.parentNode.querySelector(".movetoback");
    const newmovetobackButtonListener = (event) => {
      event.stopPropagation();
      let finalpath = "";
      const elements = Array.from(
        folder.parentNode.querySelectorAll(".movetofilepathpart")
      ).slice(1);
      for (let i = 0; i < elements.length - 1; i++) {
        finalpath += "/";
        finalpath += elements[i].children[1].textContent.replace(/\s/g, "");
        finalpath += "/";
      }
      if (finalpath.length == 0) {
        finalpath = "/";
      }
      fillmovetodir(finalpath);
      if (folder.parentNode.querySelector(".movingpath").children.length > 2) {
        folder.parentNode
          .querySelector(".movingpath")
          .removeChild(
            folder.parentNode.querySelector(".movingpath").lastChild
          );
      }
    };
    movetobackButton.removeEventListener("click", movetobackButton.listener);
    movetobackButton.listener = newmovetobackButtonListener;
    movetobackButton.addEventListener("click", movetobackButton.listener);

    const confirmmove = folder.parentNode.querySelector(".confirmmove");
    var selectedfile = folder.parentNode.parentNode.parentNode.parentNode;

    // Remove any existing event listener before adding a new one
    const newConfirmMoveListener = (event) => {
      event.stopPropagation();
      const elements = document
        .querySelector(".mobilepath")
        .querySelectorAll(".filepathpart");

      let finalpath = "";
      for (let i = 0; i < elements.length; i++) {
        finalpath += elements[i].children[1].textContent.replace(/\s/g, "");
        finalpath += "/";
      }
      if (finalpath.length == 0) {
        finalpath = "/";
      }
      let movetopath = "";
      const movetoelements = Array.from(
        folder.parentNode.querySelectorAll(".movetofilepathpart")
      ).slice(1);
      for (let i = 0; i < movetoelements.length; i++) {
        movetopath += movetoelements[i].children[1].textContent.replace(
          /\s/g,
          ""
        );
        movetopath += "/";
      }
      if (movetopath.length == 0) {
        movetopath = "/";
      }
      let filename;
      let file_action_param;

      if (!selectedfile.classList.contains("folder")) {
        filename =
          finalpath +
          selectedfile.querySelector(".filename").textContent.split(".")[0] +
          "#" +
          selectedfile.querySelector(".filename").textContent.split(".").pop() +
          "#" +
          ".zip";
        file_action_param =
          "/" +
          movetopath +
          selectedfile.querySelector(".filename").textContent.split(".")[0] +
          "#" +
          selectedfile.querySelector(".filename").textContent.split(".").pop() +
          "#" +
          ".zip";
      } else {
        filename =
          finalpath + selectedfile.querySelector(".filename").textContent;
        file_action_param =
          "/" +
          movetopath +
          selectedfile.querySelector(".filename").textContent;
      }

      connction.send(
        JSON.stringify({
          action: "Rename",
          folder_path: finalpath,
          file_action_parameter: file_action_param,
          path: filename,
        })
      );
    };

    confirmmove.removeEventListener("click", confirmmove.listener);
    confirmmove.listener = newConfirmMoveListener;
    confirmmove.addEventListener("click", confirmmove.listener);
  });
}
