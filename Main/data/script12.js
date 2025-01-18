var connction = new WebSocket("ws://" + location.hostname + ":81/");
let files_on_server = {};
var dir = [];
let icon = {};

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
    show_file_in_dir(firstKey);
  }
  console.log("Updated object:", files_on_server);
};
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
      if (dir == "/") {
        while (document.querySelector(".folder-list").children.length > 1) {
          document
            .querySelector(".folder-list")
            .removeChild(document.querySelector(".folder-list").lastChild);
        }
        var sidemenufolder = document.querySelector(".sidefolder");
        var newsidemenufolder = sidemenufolder.cloneNode(true);
        newsidemenufolder.classList.remove("hidden");
        newsidemenufolder.querySelector(".foldername").textContent =
          files_on_server[dir][i]["folder"].replace(/.*\//, "");
        document.querySelector(".folder-list").appendChild(newsidemenufolder);
      }
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
            if (fullFolderPath.replace(/.*\//, "").length > 1) {
              newfilepathpart.children[1].children[0].textContent =
                fullFolderPath.replace(/.*\//, "");
              document.querySelector(".path").appendChild(newfilepathpart);
              document.querySelector(".openfolder").children[1].textContent =
                fullFolderPath.replace(/.*\//, "");
            }
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
          // console.log(event.target  );
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
  const elements = document.querySelectorAll(".filepathpart");
  let finalpath = "";
  // find file path
  for (let i = 0; i < elements.length; i++) {
    finalpath += elements[i].children[1].textContent.replace(/\s/g, "");
    finalpath += "/";
  }
  if (finalpath.length == 0) {
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
    moveto.classList.remove("hidden");
  } else if (action === "Rename") {
    // set compelet file path
    parentElement.querySelector(".filename").classList.add("hidden");
    const renameto = document.createElement("input");
    renameto.type = "text";
    renameto.value = parentElement.querySelector(".filename").textContent;
    renameto.spellcheck = false;
    renameto.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        if (isfolder) {
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
        console.log(file_action_param);
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
  } else {
    console.log(
      JSON.stringify({
        action: action,
        folder_path: finalpath,
        path: filename,
      })
    );
    connction.send(
      JSON.stringify({
        action: action,
        folder_path: finalpath,
        path: filename,
      })
    );
  }
}

function createdir(foldername) {
  const elements = document.querySelectorAll(".filepathpart");
  let finalpath = "";
  // find file path
  for (let i = 0; i < elements.length; i++) {
    finalpath += elements[i].children[1].textContent.replace(/\s/g, "");
    finalpath += "/";
  }
  if (finalpath.length == 0) {
    finalpath = "/";
  }
  console.log(
    JSON.stringify({
      action: "Create_Folder",
      folder_path: finalpath,
      path: foldername,
    })
  );
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
    if (!movetobackButton.hasAttribute("data-event-attached")) {
      movetobackButton.addEventListener("click", (event) => {
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
        if (
          folder.parentNode.querySelector(".movingpath").children.length > 2
        ) {
          folder.parentNode
            .querySelector(".movingpath")
            .removeChild(
              folder.parentNode.querySelector(".movingpath").lastChild
            );
        }
      });
      movetobackButton.setAttribute("data-event-attached", "true");
    }

    const confirmmove = folder.parentNode.querySelector(".confirmmove");
    var selectedfile = folder.parentNode.parentNode.parentNode.parentNode;

    // Remove any existing event listener before adding a new one
    const newConfirmMoveListener = (event) => {
      event.stopPropagation();
      const elements = document.querySelectorAll(".filepathpart");

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
      console.log(
        JSON.stringify({
          action: "Rename",
          folder_path: finalpath,
          file_action_parameter: file_action_param,
          path: filename,
        })
      );
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
