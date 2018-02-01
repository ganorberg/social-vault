(function () {
  "use scrict";

  /*****************************************************************************
   *
   * Globals
   *
   ****************************************************************************/

  // Page types
  const GROUP = "group";
  const PERSON = "person";
  const DETAIL = "detail";

  // IndexedDB instantiated in Model
  let database;

  // Data flow: user event -> data mutation -> re-render + IndexedDB update
  let data = {};

  // Data flow: user event -> state mutation -> re-render
  let state = {
    displayBackButton: false,
    isLoading: true,
    page: {
      selectedGroup: "",
      selectedPerson: "",
      title: "My Groups",
      type: GROUP
    }
  };

  const el = {
    addButton: document.querySelector(".header__add"),
    backButton: document.querySelector(".header__back"),
    headerTitle: document.querySelector(".header__title"),
    listContainer: document.querySelector(".list-container"),
  };

  /*****************************************************************************
   *
   * View
   *
   ****************************************************************************/

  // Use template string to limit touching the DOM and improve render performance
  function displayItems(items = []) {
    let html = "";

    items.forEach(item => html +=
      `<li class="card">
      ${escapeHtml(item)}
      <button class="item__remove" aria-label="Remove Button">Remove</button>
    </li>`);

    el.listContainer.innerHTML = html;
  }

  function renderBackButton() {
    state.displayBackButton === true
      ? el.backButton.removeAttribute("hidden")
      : el.backButton.setAttribute("hidden", "");
  }

  function renderHeader() {
    el.headerTitle.textContent = escapeHtml(state.page.title);
  }

  function render() {
    renderBackButton();
    renderHeader();

    switch (state.page.type) {
      case GROUP: renderGroups(); break;
      case PERSON: renderPeople(); break;
      case DETAIL: renderDetails();
    }
  }

  function renderGroups() {
    displayItems(Object.keys(data));
  }

  function renderPeople() {
    displayItems(Object.keys(data[state.page.selectedGroup]));
  }

  function renderDetails() {
    displayItems(data[state.page.selectedGroup][state.page.selectedPerson]);
  }

  /*****************************************************************************
   *
   * Event listeners
   *
   ****************************************************************************/

  const handleAddClick = () => {
    const info = prompt("Enter a new " + state.page.type);
    if (info === null || info === "") {
      return;
    }

    addItem(info);
  }

  const handleBackClick = () => window.history.back();

  const handleItemClick = (e) => {
    // Bubbling tradeoff: extra conditional statement vs listeners on every li 
    // plus extra buttons alongside additional handler functions
    if (e.target.className === "item__remove") {
      removeItem(e.target.previousSibling.nodeValue.trim());
      return;
    }

    // Grab text from li only, thereby excluding button text
    const itemText = e.target.firstChild.nodeValue.trim();

    switch (state.page.type) {
      case GROUP: navigateToGroup(itemText); break;
      case PERSON: navigateToPerson(itemText); break;
      case DETAIL: return;
    }

    window.history.pushState(state, null, "");
    render();
  }

  el.addButton.addEventListener("click", handleAddClick);
  el.backButton.addEventListener("click", handleBackClick);
  el.listContainer.addEventListener("click", handleItemClick);

  // Restores previous state when user backs through History API
  window.onpopstate = function (event) {
    if (event.state) { state = event.state; }
    render();
  };

  /*****************************************************************************
   *
   * Controller
   *
   ****************************************************************************/

  function addItem(inputText = "") {
    switch (state.page.type) {
      case GROUP: addGroup(inputText); break;
      case PERSON: addPerson(inputText); break;
      case DETAIL: addDetail(inputText);
    }

    render();
    updateModel();
  }

  function addDetail(detailText) {
    data[state.page.selectedGroup][state.page.selectedPerson].push(detailText);
  }

  function addGroup(groupName) {
    if (data.hasOwnProperty(groupName)) {
      alert("That group already exists!");
      return;
    }

    data[groupName] = {};
  }

  function addPerson(personName) {
    if (data[state.page.selectedGroup].hasOwnProperty(personName)) {
      alert("That person already exists!");
      return;
    }

    data[state.page.selectedGroup][personName] = [];
  }

  function removeItem(textContent) {
    // TODO: Are you sure you'd like to delete this item? This action cannot be reversed.

    switch (state.page.type) {
      case GROUP: removeGroup(textContent); break;
      case PERSON: removePerson(textContent); break;
      case DETAIL: removeDetail(textContent);
    }

    render();
    updateModel();
  }

  function removeDetail(detailText) {
    data[state.page.selectedGroup][state.page.selectedPerson] =
      data[state.page.selectedGroup][state.page.selectedPerson]
        .filter(item => item !== detailText);
  }

  function removeGroup(groupName) {
    delete data[groupName];
  }

  function removePerson(personName) {
    delete data[state.page.selectedGroup][personName];
  }

  function navigateToGroup(groupName) {
    state.displayBackButton = true;
    state.page.selectedGroup = groupName;
    state.page.title = groupName;
    state.page.type = PERSON;
  }

  function navigateToPerson(personName) {
    state.page.selectedPerson = personName;
    state.page.title = personName;
    state.page.type = DETAIL;
  }

  /*****************************************************************************
   *
   * Model
   *
   ****************************************************************************/

  if (!window.indexedDB) {
    window.alert("Your browser doesn't support the latest data storage technology and may not be secure. Please update your browser to enable all of this app's features.");
    // TODO: dodge indexedDB code below and use localStorage methods
  }

  // const dummyData = {
  //   "Partner’s Family": {
  //     Jimmy: ["Son applying to Yale", "Moving to Texas in August"],
  //     Jack: ["Loves football", "Visiting Miami for JETS-Dolphin game"],
  //     John: ["Loves escape rooms and karaoke"]
  //   },
  //   Gym: {
  //     Patricia: ["Going to Puerto Rico for Christmas"]
  //   },
  //   Dentist: {
  //     Jessica: ["Daughter got into honors Science 10th grade"]
  //   }
  // };

  const DB_NAME = 'social-vault-db';
  const DB_STORE = 'groups';
  const DB_OBJECT_KEY = "app";
  const DB_VERSION = 1;

  // TODO: check if request has closed? close and open on every update?
  const openRequest = window.indexedDB.open(DB_NAME, DB_VERSION);

  openRequest.onupgradeneeded = function (e) {
    database = e.target.result;
    console.log('running onupgradeneeded');
    if (!database.objectStoreNames.contains(DB_STORE)) {
      database.createObjectStore(DB_STORE);
    }
  };

  openRequest.onsuccess = function (e) {
    console.log('running onsuccess');
    database = e.target.result;
    getModel();
  };

  openRequest.onerror = function (e) {
    console.log('onerror!');
    console.dir(e);
  };

  // TODO: update only new info instead of whole data object
  // TODO: don't allow user to close page while updating
  function updateModel() {
    const transaction = database.transaction([DB_STORE], 'readwrite');
    const store = transaction.objectStore(DB_STORE);
    const putRequest = store.put(data, DB_OBJECT_KEY);

    putRequest.onerror = (e) => console.log('Error', e.target.error.name);
    putRequest.onsuccess = (e) => console.log('Woot! Put successsssss');
  }

  function getModel() {
    database
      .transaction(DB_STORE)
      .objectStore(DB_STORE)
      .get(DB_OBJECT_KEY)
      .onsuccess = function (e) {
        const result = e.target.result;
        if (result) { data = result; }
        initialize();
      }
  }

  /*****************************************************************************
   *
   * Code to start the app
   *
   ****************************************************************************/


  // TODO: detect if private browsing incognito mode to alert user they cannot
  // store data.

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // If a service worker already exists at this URL, this call is ignored
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(() => console.log('[ServiceWorker] Registered'));
    });
  }


  // Called when data is received from IndexedDB
  function initialize() {
    window.history.replaceState(state, null, "");
    render();
    // TODO: tell users without JS enabled that JS is required
  };
})();

/*****************************************************************************
 *
 * Utility
 *
 ****************************************************************************/

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}