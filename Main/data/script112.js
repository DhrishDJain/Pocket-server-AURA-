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
  // window.addEventListener("popstate", function () {
  //   const url = new URL(window.location.href);
  //   if (url.pathname.includes(" ")) {
  //     // Clear all added URLs
  //     window.history.replaceState({}, "", "/");
  //     // Optionally, you can clear the folder contents here if needed
  //     show_file_in_dir(["/"]);
  //   } else {
  //     // Load the folder contents based on the current URL
  //     show_file_in_dir([url.pathname]);
  //   }
  // });
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
      newfolder.addEventListener("click", function (event) {
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
        }
      });
      // rename(optionContent);
      // Hide all option-content elements
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

function file_operation(element) {
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
  // set compelet file path
  const filename =
    finalpath +
    parentElement.querySelector(".filename").textContent.split(".")[0] +
    "#" +
    parentElement.querySelector(".filename").textContent.split(".").pop() +
    "#" +
    ".zip";
  if (action === "Rename") {
    parentElement.querySelector(".filename").classList.add("hidden");
    const renameto = document.createElement("input");
    renameto.type = "text";
    renameto.value = parentElement.querySelector(".filename").textContent;
    renameto.spellcheck = false;
    renameto.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
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
    console.log(finalpath);
    connction.send(
      JSON.stringify({
        action: action,
        folder_path: finalpath,
        path: filename,
      })
    );
  }
}
