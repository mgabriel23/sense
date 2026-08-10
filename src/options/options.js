import { DEFAULT_DEVICE_CATEGORIES } from "../viewer/devices.js";
import { getDeviceCatalog, setDeviceCatalog } from "../shared/storage.js";
import { applyStoredTheme } from "../shared/theme.js";
import { showToast } from "../shared/toast.js";

const MIN_DIMENSION = 1;
const MAX_DIMENSION = 10000;

const categoriesEl = document.getElementById("categories");
const resetAllBtn = document.getElementById("reset-all");
const saveStatus = document.getElementById("save-status");

let catalog = [];
let saveStatusTimer;

function findDefaultCategory(categoryId) {
  return structuredClone(DEFAULT_DEVICE_CATEGORIES.find((c) => c.id === categoryId));
}

function makeDeviceId(categoryId) {
  return `${categoryId}-custom-${crypto.randomUUID().slice(0, 8)}`;
}

function flashSaved() {
  saveStatus.textContent = "Saved";
  clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(() => {
    saveStatus.textContent = "";
  }, 1500);
}

async function persist() {
  await setDeviceCatalog(catalog);
  flashSaved();
}

function render() {
  categoriesEl.innerHTML = "";
  for (const category of catalog) {
    categoriesEl.appendChild(renderCategory(category));
  }
}

function renderCategory(category) {
  const card = document.createElement("section");
  card.className = "category-card";

  const header = document.createElement("div");
  header.className = "category-header";

  const heading = document.createElement("h2");
  heading.textContent = category.name;

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "btn icon-btn";
  resetBtn.textContent = "Reset";
  resetBtn.title = `Reset ${category.name} to its default devices`;
  resetBtn.addEventListener("click", () => {
    const defaults = findDefaultCategory(category.id);
    if (!defaults) return;
    const index = catalog.findIndex((c) => c.id === category.id);
    const previous = catalog[index];
    catalog[index] = defaults;
    persist();
    render();
    showToast(`Reset ${category.name} to its default devices`, {
      actionLabel: "Undo",
      onAction: () => {
        catalog[index] = previous;
        persist();
        render();
      },
    });
  });

  header.append(heading, resetBtn);

  const list = document.createElement("ul");
  list.className = "device-list";

  for (const device of category.devices) {
    list.appendChild(renderDeviceRow(category, device));
  }

  const addForm = renderAddDeviceForm(category);

  card.append(header, list, addForm);
  return card;
}

function renderDeviceRow(category, device) {
  const row = document.createElement("li");
  row.className = "device-row";

  const nameSpan = document.createElement("span");
  nameSpan.className = "device-name";
  nameSpan.textContent = device.name;

  const sizeSpan = document.createElement("span");
  sizeSpan.className = "device-size";
  sizeSpan.textContent = `${device.width}×${device.height}`;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn icon-btn";
  removeBtn.textContent = "✕";
  const isOnlyDevice = category.devices.length <= 1;
  removeBtn.disabled = isOnlyDevice;
  removeBtn.setAttribute("aria-label", `Remove ${device.name}`);
  removeBtn.title = isOnlyDevice
    ? "A category needs at least one device"
    : `Remove ${device.name}`;

  removeBtn.addEventListener("click", () => {
    const index = category.devices.findIndex((d) => d.id === device.id);
    if (index === -1) return;
    category.devices.splice(index, 1);
    persist();
    render();
    showToast(`Removed "${device.name}"`, {
      actionLabel: "Undo",
      onAction: () => {
        category.devices.splice(index, 0, device);
        persist();
        render();
      },
    });
  });

  row.append(nameSpan, sizeSpan, removeBtn);
  return row;
}

function renderAddDeviceForm(category) {
  const form = document.createElement("form");
  form.className = "add-device-form";

  // aria-label, not a visible <label>, because placeholder alone isn't
  // exposed as an accessible name reliably — but a real <label for="">
  // would need a unique id, and this form is rendered once per category
  // (4 times), so a static id would collide across cards.
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "field device-name-input";
  nameInput.placeholder = "Name (e.g. Galaxy Fold)";
  nameInput.setAttribute("aria-label", `New ${category.name} device name`);
  nameInput.required = true;

  const widthInput = document.createElement("input");
  widthInput.type = "number";
  widthInput.className = "field device-width-input";
  widthInput.placeholder = "Width";
  widthInput.setAttribute("aria-label", `New ${category.name} device width in pixels`);
  widthInput.min = String(MIN_DIMENSION);
  widthInput.max = String(MAX_DIMENSION);
  widthInput.required = true;

  const heightInput = document.createElement("input");
  heightInput.type = "number";
  heightInput.className = "field device-height-input";
  heightInput.placeholder = "Height";
  heightInput.setAttribute("aria-label", `New ${category.name} device height in pixels`);
  heightInput.min = String(MIN_DIMENSION);
  heightInput.max = String(MAX_DIMENSION);
  heightInput.required = true;

  const addBtn = document.createElement("button");
  addBtn.type = "submit";
  addBtn.className = "btn btn-primary";
  addBtn.textContent = "Add";

  const error = document.createElement("p");
  error.className = "form-error";
  error.hidden = true;

  form.append(nameInput, widthInput, heightInput, addBtn, error);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const width = Number(widthInput.value);
    const height = Number(heightInput.value);

    if (!name) {
      showFormError(error, "Enter a device name.");
      return;
    }
    if (!Number.isInteger(width) || width < MIN_DIMENSION || width > MAX_DIMENSION) {
      showFormError(error, `Width must be a whole number between ${MIN_DIMENSION} and ${MAX_DIMENSION}.`);
      return;
    }
    if (!Number.isInteger(height) || height < MIN_DIMENSION || height > MAX_DIMENSION) {
      showFormError(error, `Height must be a whole number between ${MIN_DIMENSION} and ${MAX_DIMENSION}.`);
      return;
    }

    category.devices.push({ id: makeDeviceId(category.id), name, width, height });
    persist();
    render();
  });

  return form;
}

function showFormError(errorEl, message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

resetAllBtn.addEventListener("click", () => {
  const previous = catalog;
  catalog = structuredClone(DEFAULT_DEVICE_CATEGORIES);
  persist();
  render();
  showToast("Reset all categories to their default devices", {
    actionLabel: "Undo",
    onAction: () => {
      catalog = previous;
      persist();
      render();
    },
  });
});

async function main() {
  await applyStoredTheme();

  const stored = await getDeviceCatalog();
  catalog = stored && stored.length ? stored : structuredClone(DEFAULT_DEVICE_CATEGORIES);
  render();
}

main();
