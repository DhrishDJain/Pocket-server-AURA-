var connction = new WebSocket("ws://" + location.hostname + ":81/");
var obj;
var dir = [];
let icon = {};
const fetchIcons = async () => {
  try {
    const response = await fetch("icons.json");
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    icon = await response.json();
    return icon;
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
  }
};
fetchIcons();
window.addEventListener("load", files_in_storeage);

function files_in_storeage(event) {
  connction.onmessage = files_in_storeage;
  if (event.data == "DONE") {
    show_on_web();
    return;
  }
  if (event.data == " " || event.data == undefined) {
    return;
  }
  obj = JSON.parse(event.data);
  console.log(obj)
  obj["/"].shift();
  delete obj["/System Volume Information"];
}
function show_on_web() {
  for (var x in obj) {
    dir.push(x);
  }
  show_file_in_dir("/");
  window.addEventListener("popstate", function () {
    const url = new URL(window.location.href);
    if (url.pathname.includes(" ")) {
      // Clear all added URLs
      window.history.replaceState({}, "", "/");
      // Optionally, you can clear the folder contents here if needed
      show_file_in_dir(["/"]);
    } else {
      // Load the folder contents based on the current URL
      show_file_in_dir([url.pathname]);
    }
  });
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

  for (let i = 0; i < obj[dir].length; i++) {
    var newitem = item.cloneNode(true);
    if (Object.keys(obj[dir][i])[0] == "folder") {
      var newfolder = folder.cloneNode(true);
      var newfilepathpart = filepathpart.cloneNode(true);
      newfolder.classList.remove("hidden");
      if (dir == "/") {
        var sidemenufolder = document.querySelector(".sidefolder");
        var newsidemenufolder = sidemenufolder.cloneNode(true);
        newsidemenufolder.classList.remove("hidden");
        newsidemenufolder.querySelector(".foldername").textContent = obj[dir][
          i
        ]["folder"].replace(/.*\//, "");
        document.querySelector(".folder-list").appendChild(newsidemenufolder);
      }
      newfilepathpart.classList.remove("hidden");
      newfolder.querySelector(".filename").textContent = obj[dir][i][
        "folder"
      ].replace(/.*\//, "");
      newfolder.addEventListener("click", function (event) {
        event.stopPropagation();
        const fullFolderPath = obj[dir][i]["folder"].trim();
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
      var fileExtension = obj[dir][i]["extension"];
      const filename = obj[dir][i]["filename"];
      newitem.querySelector(".filename").textContent = filename.includes("#")
        ? `${filename.split("#")[0]}.${fileExtension}`
        : filename;
      newitem.querySelector(".size").textContent = file_size_conversion(i, dir);

      // Extract the file extension
      newitem.querySelector(".dateofmodi").textContent =
        obj[dir][i]["modified_date"];
      const iconDiv = newitem.querySelector(".icon");
      // Insert the SVG content into the div

      if (icon[fileExtension] != undefined) {
        iconDiv.innerHTML = icon[fileExtension];
      }
      newitem.querySelector(".filetype").textContent = fileExtension + " File";

      document.querySelector(".item-container").appendChild(newitem);
    }
    document.querySelectorAll(".download-icon").forEach((btn) => {
      btn.addEventListener("click", function () {
        const icon = this;
        const arrow = icon.querySelector(".arrow");
        const loader = icon.querySelector(".loader");

        icon.classList.add("bouncing");
        arrow.classList.add("bounce");

        // Simulate download process
        setTimeout(() => {
          icon.classList.remove("bouncing");
          arrow.classList.remove("bounce");
          icon.classList.add("tick");
          icon.innerHTML = `
   <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    color="#ffffff">
    <path fill-rule="evenodd" clip-rule="evenodd"
        d="M20.5001 6.39667L8.48133 19.0002L3.50009 14.0141L4.92876 12.584L8.44771 16.1064L19.0386 5.00023L20.5001 6.39667Z"
        fill="#ffffff">
    </path>
</svg>
        `;

          // Reset to original SVG after 500ms
          setTimeout(() => {
            icon.classList.remove("tick");
            icon.innerHTML = `
            <div class="loader"></div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="44"
              height="44"
              viewBox="0 0 24 24"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M20.7294 10.9828L17.5535 9.39432L18.4482 7.60559L22.4468 9.60562C22.9119 9.83823 23.1211 10.3885 22.928 10.8713L18.9293 20.8712C18.7775 21.251 18.4098 21.5 18.0008 21.5L6.00082 21.5C5.59188 21.5 5.22414 21.251 5.0723 20.8712L1.07362 10.8713C0.880554 10.3885 1.08974 9.83823 1.5548 9.60562L5.55348 7.60559L6.44816 9.39432L3.2722 10.9828L6.67794 19.5L17.3237 19.5L20.7294 10.9828Z"
                fill="#ffffff"
              ></path>
              <path
                class="arrow"
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M13.0001 2.5L13.0001 11.0857L14.293 9.7927L15.7072 11.2069L12.0001 14.9143L8.29297 11.2069L9.70723 9.7927L11.0001 11.0857L11.0001 2.5H13.0001Z"
                fill="#ffffff"
              </path>
            </svg>
          `;
          }, 1000);
        }, 2000); // Simulate a 2-second download time
      });
    });
  }
}
function file_size_conversion(i, dir) {
  let bytes = obj[dir][i]["size"];
  // let size = String(bytes);

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
