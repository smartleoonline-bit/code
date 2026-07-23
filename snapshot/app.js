const API = "/api";

const state = {
  token: localStorage.getItem("messenger_token") || "",
  user: JSON.parse(localStorage.getItem("messenger_user") || "null"),
  session: null,
  tokenExpiresAt: 0,
  refreshPromise: null,
  sessionExpiredHandling: false,
  authMode: "login",
  authPreviousMode: "login",
  authPurpose: null,
  authChallengeId: null,
  authRequestPayload: null,
  authDestination: "",
  loginMethod: "email",
  recoveryMethod: "email",
  registerUsernameAvailable: false,
  registerUsernameCheckTimer: null,
  registerUsernameCheckSequence: 0,
  resendTimer: null,
  publicConfig: null,
  chats: [],
  contacts: [],
  friendRequests: {
    incoming: [],
    outgoing: [],
  },
  sidebarMode: "chats",
  profileTarget: null,
  blockedUsers: [],
  contactRequestTarget: null,
  friendRemoveTarget: null,
  managedCommunity: null,
  managedCommunityInfo: null,
  communityBans: [],
  communityActionMember: null,
  activePermissions: null,
  communityInviteSearchTimer: null,
  activeChat: null,
  activeMessages: [],
  socket: null,
  searchTimer: null,
  dialogSearchTimer: null,
  dialogSearchResults: [],
  dialogSearchChatId: null,
  searchContextActive: false,
  activeChatMute: null,
  chatClearTarget: null,
  chatDeleteTarget: null,
  sharedChatData: {
    media: [],
    files: [],
    links: [],
  },
  sharedChatTab: "media",
  sharedPanelCloseTimer: null,
  readTimer: null,

  replyToMessage: null,
  contextMessage: null,
  reactionTargetMessage: null,
  pendingMediaFiles: [],
  pendingMediaIndex: 0,
  pendingMediaUrls: [],
  pickerTab: "emoji",
  gifSearchTimer: null,
  gifResults: [],
  communityMode: "group",
  communityMembers: new Map(),
  communitySearchTimer: null,
  bootstrapContinuation: null,
  audioUnlocked: false,

  editorFileIndex: -1,
  editorSourceImage: null,
  editorTool: "draw",
  editorDrawing: false,
  editorLastPoint: null,
  editorHistory: [],
  editorStickerValue: null,

  avatarCropImage: null,
  avatarCropObjectUrl: null,
  avatarCropBaseScale: 1,
  avatarCropZoom: 1,
  avatarCropOffsetX: 0,
  avatarCropOffsetY: 0,
  avatarCropDragging: false,
  avatarCropPointerId: null,
  avatarCropLastX: 0,
  avatarCropLastY: 0,

  recorder: null,
  recorderStream: null,
  recorderChunks: [],
  recorderStartedAt: 0,
  recorderPausedAt: 0,
  recorderPausedTotal: 0,
  recorderTimer: null,
  recorderAction: "send",
  recorderStopTimer: null,
  recorderFinishing: false,

  // Telegram-like waveform is captured while the microphone is recording.
  recorderWaveformContext: null,
  recorderWaveformSource: null,
  recorderWaveformAnalyser: null,
  recorderWaveformData: null,
  recorderWaveformSamples: [],
  recorderWaveformFrame: null,
  recorderWaveformLastSampleAt: 0,

  viewerMedia: [],
  viewerIndex: 0,
  viewerZoomed: false,
  viewerTouchStartX: 0,
  viewerKind: null,
  viewerVideoControlsTimer: null,
  viewerVideoSeeking: false,

  localActivity: null,
  localActivityChatId: null,
  localActivityTimer: null,
  remoteActivity: null,
  remoteActivityTimer: null,
};

const $ = (id) => document.getElementById(id);

const authScreen = $("authScreen");
const authTabs = $("authTabs");
const loginTabButton = $("loginTabButton");
const registerTabButton = $("registerTabButton");

const loginForm = $("loginForm");
const loginEmailMethod = $("loginEmailMethod");
const loginPhoneMethod = $("loginPhoneMethod");
const loginEmailBlock = $("loginEmailBlock");
const loginPhoneBlock = $("loginPhoneBlock");
const loginEmailInput = $("loginEmailInput");
const loginCountrySelect = $("loginCountrySelect");
const loginDialCode = $("loginDialCode");
const loginPhoneInput = $("loginPhoneInput");
const loginSubmitButton = $("loginSubmitButton");
const openRecoveryButton = $("openRecoveryButton");

const registerForm = $("registerForm");
const registerNameInput = $("registerNameInput");
const registerEmailInput = $("registerEmailInput");
const registerCountrySelect = $("registerCountrySelect");
const registerDialCode = $("registerDialCode");
const registerPhoneInput = $("registerPhoneInput");
const registerUsernameInput = $("registerUsernameInput");
const registerUsernameStatus = $("registerUsernameStatus");
const registerSubmitButton = $("registerSubmitButton");
const registrationConflict = $("registrationConflict");
const registrationConflictTitle = $("registrationConflictTitle");
const registrationConflictText = $("registrationConflictText");
const conflictRecoveryButton = $("conflictRecoveryButton");

const recoveryForm = $("recoveryForm");
const recoveryEmailMethod = $("recoveryEmailMethod");
const recoveryPhoneMethod = $("recoveryPhoneMethod");
const recoveryEmailBlock = $("recoveryEmailBlock");
const recoveryPhoneBlock = $("recoveryPhoneBlock");
const recoveryEmailInput = $("recoveryEmailInput");
const recoveryCountrySelect = $("recoveryCountrySelect");
const recoveryDialCode = $("recoveryDialCode");
const recoveryPhoneInput = $("recoveryPhoneInput");
const recoverySubmitButton = $("recoverySubmitButton");
const recoveryBackButton = $("recoveryBackButton");

const authCodeForm = $("authCodeForm");
const authCodeTitle = $("authCodeTitle");
const authCodeDescription = $("authCodeDescription");
const authCodeInput = $("authCodeInput");
const authCodeSubmitButton = $("authCodeSubmitButton");
const authCodeBackButton = $("authCodeBackButton");
const authResendButton = $("authResendButton");
const testCodeBox = $("testCodeBox");
const authError = $("authError");
const messengerScreen = $("messengerScreen");
const sidebar = $("sidebar");
const selfAvatar = $("selfAvatar");
const searchInput = $("searchInput");
const searchResults = $("searchResults");
const chatList = $("chatList");
const contactList = $("contactList");
const requestList = $("requestList");
const chatsTabButton = $("chatsTabButton");
const contactsTabButton = $("contactsTabButton");
const requestsTabButton = $("requestsTabButton");
const requestsBadge = $("requestsBadge");
const bootShield = $("bootShield");
const mainMenu = $("mainMenu");
const mainMenuMuteLabel = $("mainMenuMuteLabel");

const communityModal = $("communityModal");
const communityModalTitle = $("communityModalTitle");
const communityModalHint = $("communityModalHint");
const communityModalClose = $("communityModalClose");
const communityForm = $("communityForm");
const communityTitleInput = $("communityTitleInput");
const communityDiscussionField = $("communityDiscussionField");
const communityDiscussionInput = $("communityDiscussionInput");
const communityUsernameInput = $("communityUsernameInput");
const communityDescriptionInput = $("communityDescriptionInput");
const communitySearchInput = $("communitySearchInput");
const communitySearchResults = $("communitySearchResults");
const communitySelectedMembers = $("communitySelectedMembers");
const communityStatus = $("communityStatus");
const communitySubmitButton = $("communitySubmitButton");

const muteModal = $("muteModal");
const muteModalClose = $("muteModalClose");
const muteDisableButton = $("muteDisableButton");

const appLockSettingsModal = $("appLockSettingsModal");
const appLockSettingsClose = $("appLockSettingsClose");
const pinSetupFields = $("pinSetupFields");
const pinSetupInput = $("pinSetupInput");
const pinConfirmInput = $("pinConfirmInput");
const pinEnableButton = $("pinEnableButton");
const pinEnabledActions = $("pinEnabledActions");
const pinLockNowButton = $("pinLockNowButton");
const pinChangeButton = $("pinChangeButton");
const pinDisableButton = $("pinDisableButton");
const pinSettingsStatus = $("pinSettingsStatus");

const pinUnlockOverlay = $("pinUnlockOverlay");
const pinUnlockInput = $("pinUnlockInput");
const pinUnlockButton = $("pinUnlockButton");
const pinResetLogoutButton = $("pinResetLogoutButton");
const pinUnlockStatus = $("pinUnlockStatus");

const chatPane = $("chatPane");
const chatAvatar = $("chatAvatar");
const chatTitle = $("chatTitle");
const chatStatus = $("chatStatus");
const emptyState = $("emptyState");
const messageArea = $("messageArea");
const chatHeaderInfo = $("chatHeaderInfo");
const chatAddContactButton = $("chatAddContactButton");
const chatSearchButton = $("chatSearchButton");
const chatSearchPanel = $("chatSearchPanel");
const chatSearchClose = $("chatSearchClose");
const chatSearchInput = $("chatSearchInput");
const chatSearchCount = $("chatSearchCount");
const chatSearchResults = $("chatSearchResults");
const chatMenuButton = $("chatMenuButton");
const chatHeaderMenu = $("chatHeaderMenu");
const chatMenuMuteLabel = $("chatMenuMuteLabel");
const chatMuteModal = $("chatMuteModal");
const chatMuteClose = $("chatMuteClose");
const chatMuteDescription = $("chatMuteDescription");
const chatMuteDisable = $("chatMuteDisable");
const chatMuteStatus = $("chatMuteStatus");
const chatClearModal = $("chatClearModal");
const chatClearClose = $("chatClearClose");
const chatClearCancel = $("chatClearCancel");
const chatClearTargetLabel = $("chatClearTargetLabel");
const chatClearConfirmInput = $("chatClearConfirmInput");
const chatClearConfirm = $("chatClearConfirm");
const chatClearStatus = $("chatClearStatus");

const chatDeleteModal = $("chatDeleteModal");
const chatDeleteClose = $("chatDeleteClose");
const chatDeleteCancel = $("chatDeleteCancel");
const chatDeleteTargetLabel = $("chatDeleteTargetLabel");
const chatDeleteConfirmInput = $("chatDeleteConfirmInput");
const chatDeleteConfirm = $("chatDeleteConfirm");
const chatDeleteStatus = $("chatDeleteStatus");

const chatSharedPanel = $("chatSharedPanel");
const chatSharedClose = $("chatSharedClose");
const chatSharedTitle = $("chatSharedTitle");
const chatSharedContent = $("chatSharedContent");
const communityPermissionBar = $("communityPermissionBar");
const communityPermissionText = $("communityPermissionText");
const privateLimitBar = $("privateLimitBar");
const privateLimitText = $("privateLimitText");
const privateLimitContactButton = $("privateLimitContactButton");

const uploadStatus = $("uploadStatus");
const composer = $("composer");
const documentInput = $("documentInput");
const mediaInput = $("mediaInput");
const cameraInput = $("cameraInput");
const videoCaptureInput = $("videoCaptureInput");
const audioInput = $("audioInput");
const attachmentButton = $("attachmentButton");
const attachmentMenu = $("attachmentMenu");
const messageInput = $("messageInput");

const replyComposerBar = $("replyComposerBar");
const replyComposerTitle = $("replyComposerTitle");
const replyComposerText = $("replyComposerText");
const replyComposerClose = $("replyComposerClose");

const mediaPreviewModal = $("mediaPreviewModal");
const mediaPreviewClose = $("mediaPreviewClose");
const mediaPreviewAdd = $("mediaPreviewAdd");
const mediaPreviewCounter = $("mediaPreviewCounter");
const mediaPreviewImage = $("mediaPreviewImage");
const mediaPreviewVideo = $("mediaPreviewVideo");
const mediaPreviewPrev = $("mediaPreviewPrev");
const mediaPreviewNext = $("mediaPreviewNext");
const mediaPreviewThumbnails = $("mediaPreviewThumbnails");
const mediaPreviewCaption = $("mediaPreviewCaption");
const mediaPreviewEmojiButton = $("mediaPreviewEmojiButton");
const mediaPreviewEmojiPicker = $("mediaPreviewEmojiPicker");
const mediaPreviewEmojiGrid = $("mediaPreviewEmojiGrid");
const mediaPreviewSend = $("mediaPreviewSend");
const mediaPreviewEdit = $("mediaPreviewEdit");

const contentPicker = $("contentPicker");
const contentPickerClose = $("contentPickerClose");
const contentPickerSearchRow = $("contentPickerSearchRow");
const contentPickerSearch = $("contentPickerSearch");
const contentPickerBody = $("contentPickerBody");
const contentPickerStatus = $("contentPickerStatus");

const imageEditorModal = $("imageEditorModal");
const imageEditorClose = $("imageEditorClose");
const imageEditorSave = $("imageEditorSave");
const imageEditorCanvas = $("imageEditorCanvas");
const imageEditorStage = $("imageEditorStage");
const imageEditorColor = $("imageEditorColor");
const imageEditorSize = $("imageEditorSize");
const imageEditorText = $("imageEditorText");
const imageEditorSticker = $("imageEditorSticker");
const imageEditorUndo = $("imageEditorUndo");
const imageEditorReset = $("imageEditorReset");
const imageEditorStickerTray = $("imageEditorStickerTray");

const messageContextMenu = $("messageContextMenu");
const quickReactionRow = $("quickReactionRow");
const moreReactionButton = $("moreReactionButton");
const messageDownloadAction = $("messageDownloadAction");
const messageDeleteMeAction = $("messageDeleteMeAction");
const messageDeleteEveryoneAction = $("messageDeleteEveryoneAction");

const reactionPicker = $("reactionPicker");
const reactionPickerClose = $("reactionPickerClose");
const reactionPickerSearch = $("reactionPickerSearch");
const reactionPickerGrid = $("reactionPickerGrid");
const messageInfoModal = $("messageInfoModal");
const messageInfoClose = $("messageInfoClose");
const messageInfoKind = $("messageInfoKind");
const messageInfoPreview = $("messageInfoPreview");
const messageInfoSentAt = $("messageInfoSentAt");
const messageInfoStatus = $("messageInfoStatus");
const actionButton = $("actionButton");
const micIcon = $("micIcon");
const sendIcon = $("sendIcon");

const recordBar = $("recordBar");
const recordDeleteButton = $("recordDeleteButton");
const recordTimer = $("recordTimer");
const recordWave = $("recordWave");
const recordPauseButton = $("recordPauseButton");
const pauseIcon = $("pauseIcon");
const resumeIcon = $("resumeIcon");
const recordSendButton = $("recordSendButton");

const mediaViewer = $("mediaViewer");
const viewerTitle = $("viewerTitle");
const viewerCounter = $("viewerCounter");
const viewerImage = $("viewerImage");
const viewerScroll = $("viewerScroll");
const viewerDownload = $("viewerDownload");
const viewerPrevButton = $("viewerPrevButton");
const viewerNextButton = $("viewerNextButton");
const viewerZoomButton = $("viewerZoomButton");
const viewerCloseButton = $("viewerCloseButton");

const viewerVideoShell = $("viewerVideoShell");
const viewerVideo = $("viewerVideo");
const viewerVideoCenterPlay = $("viewerVideoCenterPlay");
const viewerVideoControls = $("viewerVideoControls");
const viewerVideoPlayButton = $("viewerVideoPlayButton");
const viewerVideoProgress = $("viewerVideoProgress");
const viewerVideoCurrent = $("viewerVideoCurrent");
const viewerVideoDuration = $("viewerVideoDuration");
const viewerVideoMuteButton = $("viewerVideoMuteButton");
const viewerVideoVolume = $("viewerVideoVolume");
const viewerVideoSpeedButton = $("viewerVideoSpeedButton");
const viewerVideoFullscreenButton = $("viewerVideoFullscreenButton");

const settingsModal = $("settingsModal");
const settingsCloseButton = $("settingsCloseButton");
const settingsEmailLabel = $("settingsEmailLabel");
const settingsAvatar = $("settingsAvatar");
const profileAvatarInput = $("profileAvatarInput");
const profileAvatarButton = $("profileAvatarButton");
const profileNameInput = $("profileNameInput");
const profileUsernameInput = $("profileUsernameInput");
const profileBioInput = $("profileBioInput");
const saveProfileButton = $("saveProfileButton");
const profileStatus = $("profileStatus");
const profilePhoneInput = $("profilePhoneInput");
const settingsEmailValue = $("settingsEmailValue");
const blockedUsersSection = $("blockedUsersSection");
const blockedUsersCount = $("blockedUsersCount");
const blockedUsersList = $("blockedUsersList");

const contactRequestModal = $("contactRequestModal");
const contactRequestClose = $("contactRequestClose");
const contactRequestTargetLabel = $("contactRequestTargetLabel");
const contactRequestNameInput = $("contactRequestNameInput");
const contactRequestSendButton = $("contactRequestSendButton");
const contactRequestStatus = $("contactRequestStatus");

const userProfileModal = $("userProfileModal");
const userProfileClose = $("userProfileClose");
const viewProfileAvatar = $("viewProfileAvatar");
const viewProfileName = $("viewProfileName");
const viewProfileUsername = $("viewProfileUsername");
const viewProfileBio = $("viewProfileBio");
const viewProfilePhone = $("viewProfilePhone");
const viewProfileEmail = $("viewProfileEmail");
const viewProfilePrivacyHint = $("viewProfilePrivacyHint");
const viewProfileRelationship = $("viewProfileRelationship");
const viewProfileContactButton = $("viewProfileContactButton");
const viewProfileAcceptButton = $("viewProfileAcceptButton");
const viewProfileRemoveButton = $("viewProfileRemoveButton");
const viewProfileBlockButton = $("viewProfileBlockButton");
const viewProfileStatus = $("viewProfileStatus");

const friendRemoveModal = $("friendRemoveModal");
const friendRemoveClose = $("friendRemoveClose");
const friendRemoveCancel = $("friendRemoveCancel");
const friendRemoveTargetLabel = $("friendRemoveTargetLabel");
const friendRemoveConfirmInput = $("friendRemoveConfirmInput");
const friendRemoveConfirm = $("friendRemoveConfirm");
const friendRemoveStatus = $("friendRemoveStatus");

const communityManageModal = $("communityManageModal");
const communityManageClose = $("communityManageClose");
const communityManageTitle = $("communityManageTitle");
const communityManageType = $("communityManageType");
const communityManageAvatar = $("communityManageAvatar");
const communityManageName = $("communityManageName");
const communityManageDescription = $("communityManageDescription");
const communityManageUsername = $("communityManageUsername");
const communityManageRole = $("communityManageRole");
const communityManageMemberCount = $("communityManageMemberCount");
const communitySettingsControls = $("communitySettingsControls");
const communityMembersVisibleInput = $("communityMembersVisibleInput");
const permissionTextInput = $("permissionTextInput");
const permissionReactionsInput = $("permissionReactionsInput");
const permissionVoiceInput = $("permissionVoiceInput");
const permissionMediaInput = $("permissionMediaInput");
const permissionFilesInput = $("permissionFilesInput");
const saveCommunitySettingsButton = $("saveCommunitySettingsButton");
const communityMembersSection = $("communityMembersSection");
const communityMembersVisibilityHint = $("communityMembersVisibilityHint");
const communityMembersList = $("communityMembersList");
const communityInviteControls = $("communityInviteControls");
const communityInviteUserSearch = $("communityInviteUserSearch");
const communityInviteUserResults = $("communityInviteUserResults");
const inviteMaxUsesInput = $("inviteMaxUsesInput");
const inviteDaysInput = $("inviteDaysInput");
const createInviteLinkButton = $("createInviteLinkButton");
const createdInviteBox = $("createdInviteBox");
const createdInviteUrl = $("createdInviteUrl");
const copyCreatedInviteButton = $("copyCreatedInviteButton");
const inviteLinksList = $("inviteLinksList");
const communityManageStatus = $("communityManageStatus");
const communityBansSection = $("communityBansSection");
const communityBansCount = $("communityBansCount");
const communityBansList = $("communityBansList");
const communityExitSection = $("communityExitSection");
const communityLeaveButton = $("communityLeaveButton");
const communityDeleteButton = $("communityDeleteButton");
const communityMemberActionModal = $("communityMemberActionModal");
const communityMemberActionClose = $("communityMemberActionClose");
const communityMemberActionAvatar = $("communityMemberActionAvatar");
const communityMemberActionName = $("communityMemberActionName");
const communityMemberActionRole = $("communityMemberActionRole");
const communityMemberRoleButton = $("communityMemberRoleButton");
const communityMemberRemoveButton = $("communityMemberRemoveButton");
const communityMemberBanButton = $("communityMemberBanButton");
const communityMemberActionStatus = $("communityMemberActionStatus");
const linkEmailSection = $("linkEmailSection");
const linkEmailInput = $("linkEmailInput");
const linkEmailCodeInput = $("linkEmailCodeInput");
const linkEmailButton = $("linkEmailButton");
const verifyLinkEmailButton = $("verifyLinkEmailButton");
const linkEmailHint = $("linkEmailHint");
const sessionsList = $("sessionsList");
const refreshSessionsButton = $("refreshSessionsButton");
const logoutButton = $("logoutButton");
const logoutAllButton = $("logoutAllButton");

const avatarCropModal = $("avatarCropModal");
const avatarCropCanvas = $("avatarCropCanvas");
const avatarCropCloseButton = $("avatarCropCloseButton");
const avatarCropCancelButton = $("avatarCropCancelButton");
const avatarCropSaveButton = $("avatarCropSaveButton");
const avatarZoomInput = $("avatarZoomInput");
const avatarCropStatus = $("avatarCropStatus");
const avatarCropContext = avatarCropCanvas.getContext("2d");

const voiceAudioEngine = {
  context: null,
  nodes: new WeakMap(),
};

const waveformCache = new Map();

const appSounds = {
  send: new Audio("/sounds/otpravka.mp3"),
  receive: new Audio("/sounds/zvuk.mp3"),
};

for (const audio of Object.values(appSounds)) {
  audio.preload = "auto";
  audio.volume = 1;
}



function initials(value = "") {
  const words = String(value).trim().split(/\s+/).filter(Boolean);
  return `${words[0]?.[0] || "M"}${words[1]?.[0] || ""}`.toUpperCase();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function linkifyMessageText(value = "") {
  let source = String(value);

  const malformedHref =
    source.match(
      /class=["']message-link["'][\s\S]*?href=["']([^"']+)["'][\s\S]*?>\s*(https?:\/\/[^\s<]+|www\.[^\s<]+)/i,
    );

  if (malformedHref) {
    source =
      malformedHref[2] ||
      malformedHref[1];
  }

  const pattern =
    /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
  let result = "";
  let cursor = 0;

  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    const full = match[0];
    const trailingMatch =
      full.match(/[),.!?;:\]}]+$/);
    const trailing =
      trailingMatch?.[0] || "";
    const visible =
      trailing
        ? full.slice(
            0,
            -trailing.length,
          )
        : full;
    const href =
      visible
        .toLowerCase()
        .startsWith("www.")
        ? `https://${visible}`
        : visible;

    result += escapeHtml(
      source.slice(cursor, start),
    );

    result +=
      `<a class="message-link" href="${escapeHtml(
        href,
      )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        visible,
      )}</a>${escapeHtml(trailing)}`;

    cursor = start + full.length;
  }

  result += escapeHtml(
    source.slice(cursor),
  );

  return result.replace(
    /\r?\n/g,
    "<br>",
  );
}


function avatarUrl(key) {
  return key
    ? `/api/media/${encodeURIComponent(key)}`
    : "";
}

function avatarMarkup(name, key, classes = "avatar") {
  const safeName = escapeHtml(name || "Пользователь");

  if (key) {
    return `
      <div class="${classes} has-avatar-image" title="${safeName}">
        <img
          src="${avatarUrl(key)}"
          alt="${safeName}"
          loading="lazy"
        >
      </div>
    `;
  }

  return `
    <div class="${classes}" title="${safeName}">
      ${escapeHtml(initials(name))}
    </div>
  `;
}

function setAvatarElement(element, name, key) {
  if (!element) return;

  element.innerHTML = "";
  element.classList.toggle(
    "has-avatar-image",
    Boolean(key),
  );

  if (!key) {
    element.textContent = initials(name);
    return;
  }

  const image = document.createElement("img");
  image.src = avatarUrl(key);
  image.alt = name || "Аватар";

  image.addEventListener(
    "error",
    () => {
      element.classList.remove(
        "has-avatar-image",
      );
      element.innerHTML = "";
      element.textContent = initials(name);
    },
    { once: true },
  );

  element.appendChild(image);
}

function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(bytes = 0) {
  const size = Number(bytes) || 0;
  if (!size) return "";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let value = size;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  const digits = value >= 10 || index === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[index]}`;
}

function formatDuration(milliseconds = 0) {
  const seconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function setUploadStatus(text = "", isError = false) {
  uploadStatus.textContent = text;
  uploadStatus.classList.toggle("hidden", !text);
  uploadStatus.classList.toggle("error", isError);
}

function defaultActiveChatStatus() {
  if (!state.activeChat) return "";
  if (state.activeChat.type === "channel") return "канал";
  if (state.activeChat.type === "group") return "группа";
  return state.activeChat.peer?.online === false
    ? "был(а) недавно"
    : "в сети";
}

function showDefaultActiveChatStatus() {
  if (!state.activeChat || state.remoteActivity) return;
  chatStatus.textContent = defaultActiveChatStatus();
}

function setLocalChatActivity(action, ttl = 0) {
  const chatId = state.activeChat?.id;
  if (!chatId || !state.socket) return;

  if (state.localActivityTimer) {
    clearTimeout(state.localActivityTimer);
    state.localActivityTimer = null;
  }

  if (
    state.localActivity !== action ||
    state.localActivityChatId !== chatId
  ) {
    state.socket.emit("activity.set", { chatId, action });
  }

  state.localActivity = action;
  state.localActivityChatId = chatId;

  if (action && ttl > 0) {
    state.localActivityTimer = setTimeout(() => {
      clearLocalChatActivity(chatId);
    }, ttl);
  }
}

function clearLocalChatActivity(chatId = state.localActivityChatId) {
  if (state.localActivityTimer) {
    clearTimeout(state.localActivityTimer);
    state.localActivityTimer = null;
  }

  if (chatId && state.socket && state.localActivity) {
    state.socket.emit("activity.set", { chatId, action: null });
  }

  state.localActivity = null;
  state.localActivityChatId = null;
}

function displayRemoteActivity(action) {
  const labels = {
    typing: "печатает…",
    voice: "записывает голосовое…",
    upload: "загружает файл…",
    gif: "выбирает GIF…",
  };

  if (state.remoteActivityTimer) {
    clearTimeout(state.remoteActivityTimer);
    state.remoteActivityTimer = null;
  }

  state.remoteActivity = action || null;
  chatStatus.textContent = labels[action] || defaultActiveChatStatus();

  if (action) {
    state.remoteActivityTimer = setTimeout(() => {
      state.remoteActivity = null;
      state.remoteActivityTimer = null;
      showDefaultActiveChatStatus();
    }, 6500);
  }
}


const STORAGE_KEYS = {
  pinHash: "meetus_app_pin_hash",
  pinSalt: "meetus_app_pin_salt",
  muteUntil: "meetus_mute_until",
};

function finishBoot() {
  document.body.classList.remove("app-booting");
  bootShield.classList.add("hidden");
}

function hasAppPin() {
  return Boolean(
    localStorage.getItem(STORAGE_KEYS.pinHash) &&
    localStorage.getItem(STORAGE_KEYS.pinSalt),
  );
}

function randomSalt() {
  const bytes = crypto.getRandomValues(
    new Uint8Array(16),
  );

  return Array.from(bytes)
    .map((value) =>
      value.toString(16).padStart(2, "0"),
    )
    .join("");
}

async function hashPin(pin, salt) {
  const source = new TextEncoder().encode(
    `${salt}:${pin}`,
  );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    source,
  );

  return Array.from(new Uint8Array(digest))
    .map((value) =>
      value.toString(16).padStart(2, "0"),
    )
    .join("");
}

function sanitizePinInput(input) {
  input.value = input.value
    .replace(/\D/g, "")
    .slice(0, 4);
}

function renderPinSettings() {
  const enabled = hasAppPin();

  pinSetupFields.classList.toggle(
    "hidden",
    enabled,
  );
  pinEnabledActions.classList.toggle(
    "hidden",
    !enabled,
  );
  pinSettingsStatus.textContent = "";
  pinSetupInput.value = "";
  pinConfirmInput.value = "";
}

function openPinSettings() {
  renderPinSettings();
  appLockSettingsModal.classList.remove(
    "hidden",
  );
  toggleMainMenu(false);
}

async function enableAppPin() {
  const pin = pinSetupInput.value;
  const confirmation = pinConfirmInput.value;

  if (!/^\d{4}$/.test(pin)) {
    pinSettingsStatus.textContent =
      "PIN должен состоять ровно из четырёх цифр";
    return;
  }

  if (pin !== confirmation) {
    pinSettingsStatus.textContent =
      "PIN-коды не совпадают";
    return;
  }

  const salt = randomSalt();
  const hash = await hashPin(pin, salt);

  localStorage.setItem(
    STORAGE_KEYS.pinSalt,
    salt,
  );
  localStorage.setItem(
    STORAGE_KEYS.pinHash,
    hash,
  );

  renderPinSettings();
  pinSettingsStatus.textContent =
    "Блокировка включена";
}

function showPinUnlock(continuation = null) {
  state.bootstrapContinuation =
    continuation ||
    state.bootstrapContinuation;
  pinUnlockStatus.textContent = "";
  pinUnlockInput.value = "";
  pinUnlockOverlay.classList.remove("hidden");
  finishBoot();

  requestAnimationFrame(() =>
    pinUnlockInput.focus(),
  );
}

async function unlockApp() {
  const pin = pinUnlockInput.value;
  const salt = localStorage.getItem(
    STORAGE_KEYS.pinSalt,
  );
  const expected = localStorage.getItem(
    STORAGE_KEYS.pinHash,
  );

  if (!/^\d{4}$/.test(pin) || !salt || !expected) {
    pinUnlockStatus.textContent =
      "Введите четырёхзначный PIN";
    return;
  }

  const actual = await hashPin(pin, salt);

  if (actual !== expected) {
    pinUnlockStatus.textContent =
      "Неверный PIN";
    pinUnlockInput.select();
    return;
  }

  pinUnlockOverlay.classList.add("hidden");
  const continuation =
    state.bootstrapContinuation;
  state.bootstrapContinuation = null;

  if (continuation) {
    await continuation();
  }
}

async function disableAppPin() {
  const current = prompt(
    "Введите текущий четырёхзначный PIN",
  );

  if (current === null) return;

  const salt = localStorage.getItem(
    STORAGE_KEYS.pinSalt,
  );
  const expected = localStorage.getItem(
    STORAGE_KEYS.pinHash,
  );
  const actual = salt
    ? await hashPin(current, salt)
    : "";

  if (!expected || actual !== expected) {
    pinSettingsStatus.textContent =
      "Неверный PIN";
    return;
  }

  localStorage.removeItem(
    STORAGE_KEYS.pinHash,
  );
  localStorage.removeItem(
    STORAGE_KEYS.pinSalt,
  );
  renderPinSettings();
  pinSettingsStatus.textContent =
    "Блокировка отключена";
}

function clearAppPin() {
  localStorage.removeItem(
    STORAGE_KEYS.pinHash,
  );
  localStorage.removeItem(
    STORAGE_KEYS.pinSalt,
  );
}

function muteValue() {
  return localStorage.getItem(
    STORAGE_KEYS.muteUntil,
  );
}

function isAppMuted() {
  const value = muteValue();

  if (!value) return false;
  if (value === "forever") return true;

  const until = Number(value);

  if (!Number.isFinite(until) || until <= Date.now()) {
    localStorage.removeItem(
      STORAGE_KEYS.muteUntil,
    );
    return false;
  }

  return true;
}

function muteLabel() {
  const value = muteValue();

  if (!isAppMuted()) {
    return "Беззвучный режим";
  }

  if (value === "forever") {
    return "Без звука: навсегда";
  }

  const remaining = Math.max(
    1,
    Math.ceil((Number(value) - Date.now()) / 60000),
  );

  if (remaining < 60) {
    return `Без звука: ${remaining} мин`;
  }

  const hours = Math.ceil(remaining / 60);
  return `Без звука: ${hours} ч`;
}

function updateMuteUi() {
  mainMenuMuteLabel.textContent = muteLabel();
  muteDisableButton.classList.toggle(
    "hidden",
    !isAppMuted(),
  );
}

function chatTitleValue(chat = state.activeChat) {
  return (
    chat?.peer?.displayName ||
    chat?.title ||
    "Чат"
  );
}

function activeChatMuteStatus(chatId) {
  const chat = state.chats.find(
    (item) => item.id === chatId,
  );

  if (!chat?.is_muted) {
    return false;
  }

  if (!chat.muted_until) {
    return true;
  }

  const until =
    new Date(chat.muted_until).getTime();

  return (
    Number.isFinite(until) &&
    until > Date.now()
  );
}

function updateChatMuteMenuLabel() {
  const chat = state.activeChat;

  if (!chat) {
    chatMenuMuteLabel.textContent =
      "Без звука";
    return;
  }

  chatMenuMuteLabel.textContent =
    activeChatMuteStatus(chat.id)
      ? "Включить звук"
      : "Без звука";
}

async function loadActiveChatMute() {
  const chat = state.activeChat;

  if (!chat) return null;

  const status = await request(
    `/chats/${chat.id}/mute`,
  );

  state.activeChatMute = status;

  const stored = state.chats.find(
    (item) => item.id === chat.id,
  );

  if (stored) {
    stored.is_muted =
      Boolean(status.active);
    stored.muted_until =
      status.forever
        ? null
        : status.mutedUntil;
  }

  chat.is_muted =
    Boolean(status.active);
  chat.muted_until =
    status.forever
      ? null
      : status.mutedUntil;

  updateChatMuteMenuLabel();

  return status;
}

function closeChatHeaderMenu() {
  chatHeaderMenu.classList.add("hidden");
}

async function openChatMuteDialog() {
  const chat = state.activeChat;

  if (!chat) return;

  closeChatHeaderMenu();
  chatMuteDescription.textContent =
    `Без звука только для «${chatTitleValue(chat)}»`;
  chatMuteStatus.textContent =
    "Проверяем настройки…";
  chatMuteModal.classList.remove("hidden");

  try {
    const status =
      await loadActiveChatMute();

    chatMuteDisable.classList.toggle(
      "hidden",
      !status?.active,
    );

    chatMuteStatus.textContent =
      status?.active
        ? (
            status.forever
              ? "Сейчас звук отключён навсегда"
              : `Звук отключён до ${new Date(
                  status.mutedUntil,
                ).toLocaleString("ru-RU")}`
          )
        : "Сейчас звук включён";
  } catch (error) {
    chatMuteStatus.textContent =
      error.message;
  }
}

async function setActiveChatMute(value) {
  const chat = state.activeChat;

  if (!chat) return;

  chatMuteStatus.textContent =
    "Сохраняем…";

  try {
    const body =
      value === "off"
        ? { enabled: false }
        : value === "forever"
          ? {
              enabled: true,
              forever: true,
            }
          : {
              enabled: true,
              durationMinutes:
                Number(value),
            };

    const status = await request(
      `/chats/${chat.id}/mute`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );

    state.activeChatMute = status;
    chat.is_muted =
      Boolean(status.active);
    chat.muted_until =
      status.forever
        ? null
        : status.mutedUntil;

    const stored = state.chats.find(
      (item) => item.id === chat.id,
    );

    if (stored) {
      stored.is_muted =
        chat.is_muted;
      stored.muted_until =
        chat.muted_until;
    }

    updateChatMuteMenuLabel();
    chatMuteModal.classList.add("hidden");
    renderChats();
  } catch (error) {
    chatMuteStatus.textContent =
      error.message;
  }
}

function sharedDateLabel(value) {
  const date = new Date(value);
  const now = new Date();
  const dayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const targetStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const difference =
    Math.round(
      (dayStart - targetStart) /
      86400000,
    );

  if (difference === 0) return "Сегодня";
  if (difference === 1) return "Вчера";
  if (difference < 7) {
    return date.toLocaleDateString(
      "ru-RU",
      { weekday: "long" },
    );
  }

  return date.toLocaleDateString(
    "ru-RU",
    {
      day: "numeric",
      month: "long",
      year:
        date.getFullYear() ===
        now.getFullYear()
          ? undefined
          : "numeric",
    },
  );
}

function groupSharedItems(items) {
  const groups = new Map();

  for (const item of items) {
    const label =
      sharedDateLabel(
        item.created_at ||
        item.createdAt,
      );

    if (!groups.has(label)) {
      groups.set(label, []);
    }

    groups.get(label).push(item);
  }

  return Array.from(groups.entries());
}

function sharedMediaElement(item, index) {
  const url =
    `/api/media/${encodeURIComponent(
      item.media_key,
    )}`;
  const mime =
    String(item.mime_type || "")
      .toLowerCase();
  const isVideo =
    item.kind === "video" ||
    mime.startsWith("video/");
  const isAnimatedVideo =
    item.kind === "gif" &&
    !mime.startsWith("image/");

  const preview =
    isVideo || isAnimatedVideo
      ? `
        <video
          src="${url}"
          muted
          playsinline
          preload="metadata"
        ></video>
        <span class="shared-media-video-mark">
          ${isAnimatedVideo ? "GIF" : "▶"}
        </span>
      `
      : `
        <img
          src="${url}"
          alt="${escapeHtml(
            item.file_name ||
            "Медиа",
          )}"
          loading="lazy"
          decoding="async"
        >
      `;

  return `
    <button
      type="button"
      class="shared-media-item"
      data-shared-media-index="${index}"
    >
      ${preview}
      ${
        item.duration_ms
          ? `<span class="shared-media-duration">${escapeHtml(
              formatDuration(
                item.duration_ms,
              ),
            )}</span>`
          : ""
      }
    </button>
  `;
}

function renderSharedMedia() {
  const media =
    state.sharedChatData.media || [];

  if (!media.length) {
    chatSharedContent.innerHTML =
      '<div class="shared-empty">В этом чате пока нет фото или видео</div>';
    return;
  }

  chatSharedContent.innerHTML =
    groupSharedItems(media)
      .map(
        ([label, items]) => `
          <section class="shared-section">
            <h3>${escapeHtml(label)}</h3>
            <div class="shared-media-grid">
              ${items
                .map((item) =>
                  sharedMediaElement(
                    item,
                    media.indexOf(item),
                  ),
                )
                .join("")}
            </div>
          </section>
        `,
      )
      .join("");

  chatSharedContent
    .querySelectorAll(
      "[data-shared-media-index]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const index = Number(
            button.dataset
              .sharedMediaIndex,
          );
          const selected =
            media[index];

          if (!selected) return;

          const viewable =
            media.filter(
              (item) =>
                item.kind === "image" ||
                item.kind === "video",
            );

          const viewerIndex =
            viewable.findIndex(
              (item) =>
                item.id === selected.id,
            );

          if (viewerIndex >= 0) {
            closeUserProfilePanel(true);
            state.viewerMedia = viewable;
            state.viewerIndex =
              viewerIndex;
            state.viewerZoomed = false;
            renderMediaViewer(
              selected.kind === "video",
            );
            mediaViewer.classList.remove(
              "hidden",
            );
            document.body.classList.add(
              "viewer-open",
            );
            return;
          }

          window.open(
            `/api/media/${encodeURIComponent(
              selected.media_key,
            )}`,
            "_blank",
            "noopener",
          );
        },
      );
    });
}

function formatSharedFileSize(value) {
  const bytes = Number(value || 0);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 ** 2) {
    return `${Math.round(bytes / 1024)} КБ`;
  }

  return `${
    Math.round(
      bytes / 1024 ** 2 * 10,
    ) / 10
  } МБ`;
}

function renderSharedFiles() {
  const files =
    state.sharedChatData.files || [];

  if (!files.length) {
    chatSharedContent.innerHTML =
      '<div class="shared-empty">В этом чате пока нет документов</div>';
    return;
  }

  chatSharedContent.innerHTML =
    groupSharedItems(files)
      .map(
        ([label, items]) => `
          <section class="shared-section">
            <h3>${escapeHtml(label)}</h3>
            <div class="shared-file-list">
              ${items
                .map(
                  (item) => `
                    <a
                      class="shared-file-item"
                      href="/api/media/${encodeURIComponent(
                        item.media_key,
                      )}"
                      download="${escapeHtml(
                        item.file_name ||
                        "document",
                      )}"
                    >
                      <span class="shared-file-icon">
                        <svg viewBox="0 0 24 24">
                          <path d="M6 2h8l4 4v16H6zM14 2v5h5"/>
                        </svg>
                      </span>

                      <span>
                        <strong>${escapeHtml(
                          item.file_name ||
                          "Документ",
                        )}</strong>
                        <small>
                          ${escapeHtml(
                            formatSharedFileSize(
                              item.file_size,
                            ),
                          )}
                          ${
                            item.sender_name
                              ? ` · ${escapeHtml(
                                  item.sender_name,
                                )}`
                              : ""
                          }
                        </small>
                      </span>

                      <svg class="shared-download-icon" viewBox="0 0 24 24">
                        <path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>
                      </svg>
                    </a>
                  `,
                )
                .join("")}
            </div>
          </section>
        `,
      )
      .join("");
}

function renderSharedLinks() {
  const links =
    state.sharedChatData.links || [];

  if (!links.length) {
    chatSharedContent.innerHTML =
      '<div class="shared-empty">В этом чате пока нет ссылок</div>';
    return;
  }

  chatSharedContent.innerHTML =
    groupSharedItems(links)
      .map(
        ([label, items]) => `
          <section class="shared-section">
            <h3>${escapeHtml(label)}</h3>
            <div class="shared-link-list">
              ${items
                .map(
                  (item) => `
                    <a
                      class="shared-link-item"
                      href="${escapeHtml(
                        item.url,
                      )}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span class="shared-link-icon">
                        <svg viewBox="0 0 24 24">
                          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2"/>
                          <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>
                        </svg>
                      </span>

                      <span>
                        <strong>${escapeHtml(
                          item.url,
                        )}</strong>
                        <small>${escapeHtml(
                          item.text ||
                          item.senderName ||
                          "",
                        )}</small>
                      </span>
                    </a>
                  `,
                )
                .join("")}
            </div>
          </section>
        `,
      )
      .join("");
}

function renderSharedChatContent() {
  chatSharedPanel
    .querySelectorAll(
      "[data-shared-tab]",
    )
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.sharedTab ===
          state.sharedChatTab,
      );
    });

  if (state.sharedChatTab === "files") {
    renderSharedFiles();
    return;
  }

  if (state.sharedChatTab === "links") {
    renderSharedLinks();
    return;
  }

  renderSharedMedia();
}

function closeSharedChatPanel() {
  if (
    chatSharedPanel.classList.contains(
      "hidden",
    )
  ) {
    return;
  }

  clearTimeout(
    state.sharedPanelCloseTimer,
  );

  chatSharedPanel.classList.remove(
    "shared-panel-visible",
  );
  chatSharedPanel.classList.add(
    "shared-panel-closing",
  );
  messengerScreen.classList.remove(
    "chat-shared-panel-open",
  );

  state.sharedPanelCloseTimer =
    setTimeout(() => {
      chatSharedPanel.classList.add(
        "hidden",
      );
      chatSharedPanel.classList.remove(
        "shared-panel-closing",
      );
    }, 250);
}

async function openSharedChatPanel() {
  const chat = state.activeChat;

  if (!chat) return;

  closeChatHeaderMenu();
  closeUserProfilePanel();
  communityManageModal.classList.add(
    "hidden",
  );

  state.sharedChatTab = "media";
  chatSharedTitle.textContent =
    chatTitleValue(chat);
  chatSharedContent.innerHTML =
    '<div class="loading">Загружаем материалы…</div>';

  chatSharedPanel.classList.remove(
    "hidden",
    "shared-panel-closing",
  );
  messengerScreen.classList.add(
    "chat-shared-panel-open",
  );

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      chatSharedPanel.classList.add(
        "shared-panel-visible",
      );
    });
  });

  try {
    const result = await request(
      `/chats/${chat.id}/shared`,
    );

    state.sharedChatData = {
      media:
        Array.isArray(result.media)
          ? result.media.filter(
              (item) =>
                item.kind === "image" ||
                item.kind === "video",
            )
          : [],
      files:
        Array.isArray(result.files)
          ? result.files
          : [],
      links:
        Array.isArray(result.links)
          ? result.links
          : [],
    };

    renderSharedChatContent();
  } catch (error) {
    chatSharedContent.innerHTML =
      `<div class="shared-empty">${escapeHtml(
        error.message,
      )}</div>`;
  }
}


function setAppMute(value) {
  if (value === "forever") {
    localStorage.setItem(
      STORAGE_KEYS.muteUntil,
      "forever",
    );
  } else {
    localStorage.setItem(
      STORAGE_KEYS.muteUntil,
      String(
        Date.now() +
        Number(value) * 60_000,
      ),
    );
  }

  updateMuteUi();
  muteModal.classList.add("hidden");
}

function disableAppMute() {
  localStorage.removeItem(
    STORAGE_KEYS.muteUntil,
  );
  updateMuteUi();
  muteModal.classList.add("hidden");
}

function unlockAudio() {
  if (state.audioUnlocked) return;

  state.audioUnlocked = true;

  for (const audio of Object.values(appSounds)) {
    audio.load();
  }
}

async function playAppSound(type) {
  if (isAppMuted()) return;

  const source = appSounds[type];

  if (!source) return;

  try {
    const audio = source.cloneNode(true);
    audio.volume = 1;
    await audio.play();
  } catch {
    // Browser blocks sounds until the first user interaction.
  }
}

function restoreCommunityMenuActions() {
  [
    "group",
    "channel",
    "linked",
  ].forEach((action) => {
    const button = mainMenu.querySelector(
      `[data-main-action="${action}"]`,
    );

    if (!button) return;

    button.hidden = false;
    button.disabled = false;
    button.classList.remove("hidden");
    button.removeAttribute("aria-hidden");
    button.style.removeProperty("display");
  });
}

function toggleMainMenu(force) {
  const shouldOpen =
    typeof force === "boolean"
      ? force
      : mainMenu.classList.contains("hidden");

  mainMenu.classList.toggle(
    "hidden",
    !shouldOpen,
  );

  if (shouldOpen) {
    restoreCommunityMenuActions();
    updateMuteUi();
  }
}

restoreCommunityMenuActions();

function communityModeText(mode) {
  return {
    group: {
      title: "Создать группу",
      hint: "Все участники могут писать сообщения",
      submit: "Создать группу",
    },
    channel: {
      title: "Создать канал",
      hint: "Публиковать могут владелец и администраторы",
      submit: "Создать канал",
    },
    linked: {
      title: "Канал + группа",
      hint: "Создадим канал и связанную группу обсуждения",
      submit: "Создать связку",
    },
  }[mode];
}

function renderCommunitySelectedMembers() {
  const members = Array.from(
    state.communityMembers.values(),
  );

  communitySelectedMembers.innerHTML =
    members.length
      ? members
          .map(
            (user) => `
              <button
                type="button"
                class="selected-member-chip"
                data-remove-community-member="${user.id}"
              >
                ${escapeHtml(user.display_name)}
                <span>×</span>
              </button>
            `,
          )
          .join("")
      : '<span class="community-empty-members">Участники пока не выбраны</span>';

  communitySelectedMembers
    .querySelectorAll(
      "[data-remove-community-member]",
    )
    .forEach((button) => {
      button.addEventListener("click", () => {
        state.communityMembers.delete(
          button.dataset.removeCommunityMember,
        );
        renderCommunitySelectedMembers();
      });
    });
}

function openCommunityModal(mode) {
  state.communityMode = mode;
  state.communityMembers.clear();

  const labels = communityModeText(mode);

  communityModalTitle.textContent =
    labels.title;
  communityModalHint.textContent =
    labels.hint;
  communitySubmitButton.textContent =
    labels.submit;

  communityDiscussionField.classList.toggle(
    "hidden",
    mode !== "linked",
  );

  communityTitleInput.value = "";
  communityDiscussionInput.value = "";
  communityUsernameInput.value = "";
  communityDescriptionInput.value = "";
  communitySearchInput.value = "";
  communitySearchResults.innerHTML = "";
  communityStatus.textContent = "";
  renderCommunitySelectedMembers();

  communityModal.classList.remove("hidden");
  toggleMainMenu(false);

  requestAnimationFrame(() =>
    communityTitleInput.focus(),
  );
}

async function searchCommunityUsers(query) {
  const clean = query.trim();

  if (clean.length < 2) {
    communitySearchResults.innerHTML = "";
    return;
  }

  try {
    const users = await request(
      `/users/search?q=${encodeURIComponent(clean)}`,
    );

    const available = users.filter(
      (user) =>
        !state.communityMembers.has(user.id),
    );

    communitySearchResults.innerHTML =
      available.length
        ? available
            .map(
              (user) => `
                <button
                  type="button"
                  class="community-search-user"
                  data-community-user="${user.id}"
                >
                  ${avatarMarkup(
                    user.display_name,
                    user.avatar_key,
                    "avatar community-user-avatar",
                  )}
                  <span>
                    <strong>${escapeHtml(user.display_name)}</strong>
                    <small>${
                      user.username
                        ? `@${escapeHtml(user.username)}`
                        : escapeHtml(user.phone || "")
                    }</small>
                  </span>
                </button>
              `,
            )
            .join("")
        : '<div class="empty-list">Ничего не найдено</div>';

    communitySearchResults
      .querySelectorAll(
        "[data-community-user]",
      )
      .forEach((button) => {
        button.addEventListener("click", () => {
          const user = users.find(
            (item) =>
              item.id ===
              button.dataset.communityUser,
          );

          if (user) {
            state.communityMembers.set(
              user.id,
              user,
            );
            renderCommunitySelectedMembers();
            communitySearchResults.innerHTML = "";
            communitySearchInput.value = "";
            communitySearchInput.focus();
          }
        });
      });
  } catch (error) {
    communitySearchResults.innerHTML =
      `<div class="empty-list">${escapeHtml(error.message)}</div>`;
  }
}

async function submitCommunity() {
  const title =
    communityTitleInput.value.trim();
  const username =
    communityUsernameInput.value
      .trim()
      .replace(/^@/, "");
  const description =
    communityDescriptionInput.value.trim();

  if (!title) {
    communityStatus.textContent =
      "Введите название";
    return;
  }

  if (
    username &&
    !/^[A-Za-z0-9]{6,32}$/.test(username)
  ) {
    communityStatus.textContent =
      "Username: только английские буквы и цифры, минимум 6 символов";
    return;
  }

  const payload = {
    title,
    description,
    username: username || undefined,
    memberIds: Array.from(
      state.communityMembers.keys(),
    ),
  };

  if (state.communityMode === "linked") {
    payload.discussionTitle =
      communityDiscussionInput.value.trim() ||
      `${title} — обсуждение`;
  }

  communitySubmitButton.disabled = true;
  communityStatus.textContent =
    "Создаём…";

  try {
    const endpoint = {
      group: "/chats/group",
      channel: "/chats/channel",
      linked: "/chats/linked",
    }[state.communityMode];

    const result = await request(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    communityModal.classList.add("hidden");
    await loadChats(false);

    const createdId =
      result.channel?.id ||
      result.id;

    const chat = state.chats.find(
      (item) => item.id === createdId,
    );

    if (chat) {
      openChat(chat);
    }
  } catch (error) {
    communityStatus.textContent =
      error.message ||
      "Не удалось создать сообщество";

    console.error(
      "Community creation failed",
      error,
    );
  } finally {
    communitySubmitButton.disabled = false;
  }
}

async function rawRequest(path, options = {}) {
  const headers = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(state.token && options.auth !== false
      ? { Authorization: `Bearer ${state.token}` }
      : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${API}${path}`, {
      ...options,
      credentials: "same-origin",
      headers,
    });

    const raw = await response.text();
    let data = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }

    return { response, data, networkError: false };
  } catch (error) {
    return {
      response: null,
      data: null,
      networkError: true,
      error,
    };
  }
}

async function request(path, options = {}) {
  let result = await rawRequest(path, options);

  if (result.networkError) {
    throw new Error("Нет соединения с сервером");
  }

  if (
    result.response.status === 401 &&
    options.auth !== false &&
    options.retryAuth !== false &&
    hasSessionHint()
  ) {
    const refreshResult = await refreshAccessToken();

    if (refreshResult === "ok") {
      result = await rawRequest(path, {
        ...options,
        retryAuth: false,
      });
    } else if (refreshResult === "unauthorized") {
      handleSessionExpired();
    }
  }

  if (!result.response?.ok) {
    const message =
      Array.isArray(result.data?.message)
        ? result.data.message.join(", ")
        : result.data?.message ||
          `Ошибка ${result.response?.status || 0}`;

    const error = new Error(message);
    error.status = result.response?.status || 0;
    error.code = result.data?.code || null;
    error.payload = result.data;
    throw error;
  }

  return result.data;
}

function hasSessionHint() {
  return (
    localStorage.getItem("meetus_session_hint") === "1" ||
    Boolean(localStorage.getItem("messenger_user")) ||
    Boolean(localStorage.getItem("messenger_token"))
  );
}

function saveSessionPayload(payload) {
  state.sessionExpiredHandling = false;
  state.token = payload.accessToken;
  state.user = payload.user;
  state.session = payload.session || null;
  state.tokenExpiresAt =
    Date.now() +
    Number(payload.accessExpiresIn || 900) * 1000;

  localStorage.removeItem("messenger_token");
  localStorage.setItem(
    "messenger_user",
    JSON.stringify(state.user),
  );
  localStorage.setItem("meetus_session_hint", "1");
}

function clearLocalSession() {
  state.token = "";
  state.user = null;
  state.session = null;
  state.tokenExpiresAt = 0;

  localStorage.removeItem("messenger_token");
  localStorage.removeItem("messenger_user");
  localStorage.removeItem("meetus_session_hint");

  state.socket?.disconnect();
  state.socket = null;
}

function handleSessionExpired(
  message = "Сессия истекла. Войдите снова.",
) {
  if (state.sessionExpiredHandling) return;
  state.sessionExpiredHandling = true;

  if (state.recorder) {
    state.recorderAction = "delete";

    try {
      if (state.recorder.state !== "inactive") {
        state.recorder.stop();
      }
    } catch {}
  }

  clearLocalSession();
  state.chats = [];
  state.contacts = [];
  state.activeChat = null;
  state.activeMessages = [];
  state.activePermissions = null;

  messengerScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
  showAuthMode("login");
  authError.textContent = message;
}

async function refreshAccessToken() {
  if (state.refreshPromise) {
    return state.refreshPromise;
  }

  state.refreshPromise = (async () => {
    const result = await rawRequest("/auth/refresh", {
      method: "POST",
      auth: false,
    });

    if (result.networkError) {
      return "network";
    }

    if (result.response.status === 401) {
      return "unauthorized";
    }

    if (!result.response.ok) {
      return "error";
    }

    saveSessionPayload(result.data);
    return "ok";
  })();

  try {
    return await state.refreshPromise;
  } finally {
    state.refreshPromise = null;
  }
}

async function loadPublicConfig() {
  try {
    state.publicConfig = await request("/auth/config", {
      auth: false,
    });
  } catch {
    state.publicConfig = null;
  }
}

function countryFlag(iso) {
  return String(iso)
    .toUpperCase()
    .replace(/[A-Z]/g, (letter) =>
      String.fromCodePoint(127397 + letter.charCodeAt(0)),
    );
}

function populateCountrySelect(select, preferredIso = "KZ") {
  const countries = Array.isArray(window.MEETUS_COUNTRIES)
    ? window.MEETUS_COUNTRIES
    : [];

  select.innerHTML = countries
    .map(
      (country) => `
        <option
          value="${escapeHtml(country.iso)}"
          data-dial="${escapeHtml(country.dial)}"
          ${country.iso === preferredIso ? "selected" : ""}
        >
          ${countryFlag(country.iso)} ${escapeHtml(country.name)} ${escapeHtml(country.dial)}
        </option>
      `,
    )
    .join("");
}

function selectedDialCode(select) {
  return (
    select.selectedOptions[0]?.dataset.dial ||
    "+7"
  );
}

function updateDialCode(select, label) {
  label.textContent = selectedDialCode(select);
}

function normalizeNationalNumber(value) {
  return String(value).replace(/\D/g, "");
}

function fullPhone(select, input) {
  const dial =
    selectedDialCode(select).replace(/\D/g, "");
  let local =
    normalizeNationalNumber(input.value);

  if (!local) return "";

  if (local.startsWith("00")) {
    local = local.slice(2);
  }

  // В поле вставили уже полный международный номер.
  if (
    local.startsWith(dial) &&
    local.length >= dial.length + 7
  ) {
    return `+${local}`;
  }

  // Казахстан/Россия: принимаем 8 700..., 7 700...
  // и не дублируем выбранный код +7.
  if (
    dial === "7" &&
    local.length === 11 &&
    (
      local.startsWith("7") ||
      local.startsWith("8")
    )
  ) {
    return `+7${local.slice(1)}`;
  }

  while (local.startsWith("0")) {
    local = local.slice(1);
  }

  if (!local) return "";

  return `+${dial}${local}`;
}

function resetAuthError() {
  authError.textContent = "";
}

function showAuthMode(mode) {
  state.authMode = mode;
  resetAuthError();

  const isMain = mode === "login" || mode === "register";

  authTabs.classList.toggle("hidden", !isMain);
  loginForm.classList.toggle("hidden", mode !== "login");
  registerForm.classList.toggle("hidden", mode !== "register");
  recoveryForm.classList.toggle("hidden", mode !== "recovery");
  authCodeForm.classList.toggle("hidden", mode !== "code");

  loginTabButton.classList.toggle("active", mode === "login");
  registerTabButton.classList.toggle("active", mode === "register");

  if (mode === "login") {
    requestAnimationFrame(() => {
      if (state.loginMethod === "email") {
        loginEmailInput.focus();
      } else {
        loginPhoneInput.focus();
      }
    });
  }

  if (mode === "register") {
    requestAnimationFrame(() => registerNameInput.focus());
  }

  if (mode === "recovery") {
    requestAnimationFrame(() => {
      if (state.recoveryMethod === "email") {
        recoveryEmailInput.focus();
      } else {
        recoveryPhoneInput.focus();
      }
    });
  }

  if (mode === "code") {
    requestAnimationFrame(() => authCodeInput.focus());
  }
}

function setLoginMethod(method) {
  state.loginMethod = method;

  loginEmailMethod.classList.toggle(
    "active",
    method === "email",
  );
  loginPhoneMethod.classList.toggle(
    "active",
    method === "phone",
  );

  loginEmailBlock.classList.toggle(
    "hidden",
    method !== "email",
  );
  loginPhoneBlock.classList.toggle(
    "hidden",
    method !== "phone",
  );

  resetAuthError();

  requestAnimationFrame(() => {
    if (method === "email") {
      loginEmailInput.focus();
    } else {
      loginPhoneInput.focus();
    }
  });
}

function setRecoveryMethod(method) {
  state.recoveryMethod = method;

  recoveryEmailMethod.classList.toggle(
    "active",
    method === "email",
  );
  recoveryPhoneMethod.classList.toggle(
    "active",
    method === "phone",
  );

  recoveryEmailBlock.classList.toggle(
    "hidden",
    method !== "email",
  );
  recoveryPhoneBlock.classList.toggle(
    "hidden",
    method !== "phone",
  );
}

function startResendCountdown(seconds = 60) {
  clearInterval(state.resendTimer);
  let left = seconds;

  authResendButton.disabled = true;
  authResendButton.textContent =
    `Отправить повторно через ${left} сек.`;

  state.resendTimer = setInterval(() => {
    left -= 1;

    if (left <= 0) {
      clearInterval(state.resendTimer);
      authResendButton.disabled = false;
      authResendButton.textContent =
        "Отправить код повторно";
      return;
    }

    authResendButton.textContent =
      `Отправить повторно через ${left} сек.`;
  }, 1000);
}

function showCodeStep({
  purpose,
  challengeId,
  destination,
  title,
  testCode,
  requestPayload,
  retryAfter,
}) {
  state.authPurpose = purpose;
  state.authChallengeId = challengeId;
  state.authDestination = destination || "";
  state.authRequestPayload = requestPayload || null;
  state.authPreviousMode =
    purpose === "register"
      ? "register"
      : purpose === "recovery"
        ? "recovery"
        : "login";

  authCodeTitle.textContent = title || "Введите код";
  authCodeDescription.textContent = destination
    ? `Код отправлен на ${destination}`
    : "Код отправлен на почту";
  authCodeInput.value = "";

  if (testCode) {
    testCodeBox.textContent =
      `Тестовый режим: код ${testCode}`;
    testCodeBox.classList.remove("hidden");
  } else {
    testCodeBox.classList.add("hidden");
  }

  showAuthMode("code");
  startResendCountdown(retryAfter || 60);
}

async function requestLoginCode() {
  const requestPayload =
    state.loginMethod === "email"
      ? {
          method: "email",
          email: loginEmailInput.value
            .trim()
            .toLowerCase(),
        }
      : {
          method: "phone",
          phone: fullPhone(
            loginCountrySelect,
            loginPhoneInput,
          ),
        };

  if (
    (requestPayload.method === "email" &&
      !requestPayload.email) ||
    (requestPayload.method === "phone" &&
      !requestPayload.phone)
  ) {
    authError.textContent =
      state.loginMethod === "email"
        ? "Введите email"
        : "Введите номер телефона";
    return;
  }

  if (
    requestPayload.method === "phone" &&
    !/^\+[1-9]\d{6,14}$/.test(
      requestPayload.phone,
    )
  ) {
    authError.textContent =
      "Проверьте номер телефона";
    return;
  }

  loginSubmitButton.disabled = true;
  loginSubmitButton.textContent =
    "Ищем аккаунт…";
  resetAuthError();

  try {
    const result = await request(
      "/auth/login/request",
      {
        method: "POST",
        auth: false,
        body: JSON.stringify(requestPayload),
      },
    );

    showCodeStep({
      purpose: "login",
      challengeId: result.challengeId,
      destination: result.destination,
      title: "Вход в аккаунт",
      testCode: result.testCode,
      requestPayload,
      retryAfter: result.retryAfter,
    });
  } catch (error) {
    const accountNotFoundByPhone =
      requestPayload.method === "phone" &&
      error.code === "ACCOUNT_NOT_FOUND";

    authError.textContent =
      accountNotFoundByPhone
        ? "Аккаунт по этому номеру не найден. Номер должен быть заранее сохранён в профиле этого аккаунта. Войдите по email, добавьте номер в профиль и затем вход по телефону заработает."
        : error.message;

    if (error.code === "ACCOUNT_NOT_FOUND") {
      if (state.loginMethod === "email") {
        registerEmailInput.value =
          loginEmailInput.value.trim();
      } else {
        registerPhoneInput.value =
          loginPhoneInput.value;
        registerCountrySelect.value =
          loginCountrySelect.value;
        updateDialCode(
          registerCountrySelect,
          registerDialCode,
        );
      }

      registerTabButton.classList.add(
        "attention",
      );
    }
  } finally {
    loginSubmitButton.disabled = false;
    loginSubmitButton.textContent =
      "Получить код";
  }
}

function normalizedRegistrationUsername() {
  return registerUsernameInput.value
    .trim()
    .replace(/^@/, "");
}

function usernameFormatMessage(username) {
  if (username.length < 6) {
    return "Минимум 6 символов";
  }

  if (username.length > 32) {
    return "Максимум 32 символа";
  }

  if (!/^[A-Za-z0-9]+$/.test(username)) {
    return "Разрешены только английские буквы и цифры";
  }

  return "";
}

function setUsernameStatus(
  message,
  status = "neutral",
) {
  registerUsernameStatus.textContent = message;
  registerUsernameStatus.classList.remove(
    "checking",
    "available",
    "unavailable",
  );

  if (status !== "neutral") {
    registerUsernameStatus.classList.add(
      status,
    );
  }
}

function syncRegisterSubmitButton() {
  registerSubmitButton.disabled =
    !state.registerUsernameAvailable;
}

async function checkRegistrationUsername() {
  clearTimeout(
    state.registerUsernameCheckTimer,
  );

  const username =
    normalizedRegistrationUsername();
  const formatError =
    usernameFormatMessage(username);

  state.registerUsernameAvailable = false;
  syncRegisterSubmitButton();

  if (formatError) {
    setUsernameStatus(
      formatError,
      "unavailable",
    );
    return false;
  }

  const sequence =
    ++state.registerUsernameCheckSequence;

  setUsernameStatus(
    "Проверяем username…",
    "checking",
  );

  try {
    const result = await request(
      "/auth/username/check",
      {
        method: "POST",
        auth: false,
        body: JSON.stringify({ username }),
      },
    );

    if (
      sequence !==
      state.registerUsernameCheckSequence
    ) {
      return false;
    }

    state.registerUsernameAvailable =
      Boolean(result.available);

    setUsernameStatus(
      result.available
        ? "Username свободен"
        : "Этот username уже занят",
      result.available
        ? "available"
        : "unavailable",
    );

    syncRegisterSubmitButton();
    return state.registerUsernameAvailable;
  } catch (error) {
    if (
      sequence !==
      state.registerUsernameCheckSequence
    ) {
      return false;
    }

    state.registerUsernameAvailable = false;
    setUsernameStatus(
      error.message,
      "unavailable",
    );
    syncRegisterSubmitButton();
    return false;
  }
}

function scheduleUsernameCheck() {
  clearTimeout(
    state.registerUsernameCheckTimer,
  );

  state.registerUsernameAvailable = false;
  syncRegisterSubmitButton();

  const username =
    normalizedRegistrationUsername();
  const formatError =
    usernameFormatMessage(username);

  if (formatError) {
    setUsernameStatus(
      formatError,
      "unavailable",
    );
    return;
  }

  setUsernameStatus(
    "Проверяем username…",
    "checking",
  );

  state.registerUsernameCheckTimer =
    setTimeout(
      checkRegistrationUsername,
      350,
    );
}

async function requestRegistrationCode() {
  const displayName = registerNameInput.value.trim();
  const email = registerEmailInput.value
    .trim()
    .toLowerCase();
  const phone = fullPhone(
    registerCountrySelect,
    registerPhoneInput,
  );
  const username =
    normalizedRegistrationUsername();

  registrationConflict.classList.add("hidden");

  if (!displayName || !email || !phone || !username) {
    authError.textContent =
      "Заполните имя, email, телефон и username";
    return;
  }

  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    authError.textContent =
      "Проверьте номер телефона";
    return;
  }

  const usernameReady =
    await checkRegistrationUsername();

  if (!usernameReady) {
    authError.textContent =
      "Выберите свободный username";
    return;
  }

  registerSubmitButton.disabled = true;
  registerSubmitButton.textContent =
    "Проверяем данные…";
  resetAuthError();

  const requestPayload = {
    displayName,
    email,
    phone,
    username,
  };

  try {
    const check = await request(
      "/auth/register/check",
      {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          email,
          phone,
          username,
        }),
      },
    );

    if (!check.available) {
      showRegistrationConflict(check);
      return;
    }

    registerSubmitButton.textContent =
      "Отправляем код…";

    const result = await request(
      "/auth/register/request",
      {
        method: "POST",
        auth: false,
        body: JSON.stringify(requestPayload),
      },
    );

    showCodeStep({
      purpose: "register",
      challengeId: result.challengeId,
      destination: result.destination || email,
      title: "Подтверждение регистрации",
      testCode: result.testCode,
      requestPayload,
      retryAfter: result.retryAfter,
    });
  } catch (error) {
    if (
      error.code === "ACCOUNT_EXISTS" ||
      error.status === 409
    ) {
      showRegistrationConflict(
        error.payload || {
          message: error.message,
        },
      );
    } else {
      authError.textContent = error.message;
    }
  } finally {
    registerSubmitButton.textContent =
      "Зарегистрироваться";
    syncRegisterSubmitButton();
  }
}

function showRegistrationConflict(result) {
  if (
    result.conflict === "username" ||
    result.code === "USERNAME_TAKEN"
  ) {
    registrationConflict.classList.add("hidden");
    state.registerUsernameAvailable = false;
    setUsernameStatus(
      "Этот username уже занят",
      "unavailable",
    );
    syncRegisterSubmitButton();
    authError.textContent =
      "Выберите другой username";
    return;
  }

  registrationConflictTitle.textContent =
    "Аккаунт уже существует";
  registrationConflictText.textContent =
    result.recoveryEmail
      ? `${result.message}. Код восстановления можно отправить на ${result.recoveryEmail}.`
      : result.message ||
        "Такие данные уже используются.";

  registrationConflict.classList.remove("hidden");
  authError.textContent = "";
}

async function requestRecoveryCode() {
  const payload =
    state.recoveryMethod === "email"
      ? {
          method: "email",
          email: recoveryEmailInput.value
            .trim()
            .toLowerCase(),
        }
      : {
          method: "phone",
          phone: fullPhone(
            recoveryCountrySelect,
            recoveryPhoneInput,
          ),
        };

  if (
    (payload.method === "email" && !payload.email) ||
    (payload.method === "phone" && !payload.phone)
  ) {
    authError.textContent =
      "Введите данные аккаунта";
    return;
  }

  recoverySubmitButton.disabled = true;
  recoverySubmitButton.textContent =
    "Ищем аккаунт…";
  resetAuthError();

  try {
    const result = await request(
      "/auth/recovery/request",
      {
        method: "POST",
        auth: false,
        body: JSON.stringify(payload),
      },
    );

    showCodeStep({
      purpose: "recovery",
      challengeId: result.challengeId,
      destination: result.destination,
      title: "Восстановление доступа",
      testCode: result.testCode,
      requestPayload: payload,
      retryAfter: result.retryAfter,
    });
  } catch (error) {
    authError.textContent = error.message;
  } finally {
    recoverySubmitButton.disabled = false;
    recoverySubmitButton.textContent =
      "Восстановить доступ";
  }
}

async function verifyAuthCode() {
  const code = authCodeInput.value.trim();

  if (!/^\d{6}$/.test(code)) {
    authError.textContent =
      "Введите шестизначный код";
    return;
  }

  if (!state.authChallengeId || !state.authPurpose) {
    authError.textContent =
      "Запросите новый код";
    return;
  }

  authCodeSubmitButton.disabled = true;
  authCodeSubmitButton.textContent =
    "Проверяем…";
  resetAuthError();

  try {
    const payload = await request(
      `/auth/${state.authPurpose}/verify`,
      {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          challengeId: state.authChallengeId,
          code,
          deviceName: browserDeviceName(),
        }),
      },
    );

    saveSessionPayload(payload);
    showMessenger();
  } catch (error) {
    authError.textContent = error.message;
  } finally {
    authCodeSubmitButton.disabled = false;
    authCodeSubmitButton.textContent =
      "Подтвердить";
  }
}

async function resendAuthCode() {
  const payload = state.authRequestPayload;
  const purpose = state.authPurpose;

  if (!payload || !purpose) {
    showAuthMode(state.authPreviousMode);
    return;
  }

  authResendButton.disabled = true;
  resetAuthError();

  try {
    const endpoint =
      purpose === "login"
        ? "/auth/login/request"
        : purpose === "register"
          ? "/auth/register/request"
          : "/auth/recovery/request";

    const result = await request(endpoint, {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload),
    });

    state.authChallengeId =
      result.challengeId;
    state.authDestination =
      result.destination ||
      state.authDestination;

    authCodeDescription.textContent =
      `Новый код отправлен на ${state.authDestination}`;

    if (result.testCode) {
      testCodeBox.textContent =
        `Тестовый режим: код ${result.testCode}`;
      testCodeBox.classList.remove("hidden");
    } else {
      testCodeBox.classList.add("hidden");
    }

    startResendCountdown(
      result.retryAfter || 60,
    );
  } catch (error) {
    authError.textContent = error.message;
    authResendButton.disabled = false;
  }
}

async function continueAuthBootstrap() {
  if (state.token && state.user) {
    showMessenger();
    return;
  }

  if (!hasSessionHint()) {
    authScreen.classList.remove("hidden");
    messengerScreen.classList.add("hidden");
    showAuthMode("login");
    return;
  }

  const refreshed =
    await refreshAccessToken();

  if (refreshed === "ok") {
    showMessenger();
    return;
  }

  if (refreshed === "unauthorized") {
    clearLocalSession();
  }

  authScreen.classList.remove("hidden");
  messengerScreen.classList.add("hidden");
  showAuthMode("login");

  if (refreshed === "network") {
    authError.textContent =
      "Не удалось связаться с сервером. Проверьте интернет и обновите страницу.";
  }
}

async function bootstrapAuth() {
  populateCountrySelect(
    loginCountrySelect,
    "KZ",
  );
  populateCountrySelect(
    registerCountrySelect,
    "KZ",
  );
  populateCountrySelect(
    recoveryCountrySelect,
    "KZ",
  );

  updateDialCode(
    loginCountrySelect,
    loginDialCode,
  );
  updateDialCode(
    registerCountrySelect,
    registerDialCode,
  );
  updateDialCode(
    recoveryCountrySelect,
    recoveryDialCode,
  );

  await loadPublicConfig();

  if (hasAppPin()) {
    showPinUnlock(
      continueAuthBootstrap,
    );
    return;
  }

  await continueAuthBootstrap();
  finishBoot();
}

function browserDeviceName() {
  const ua = navigator.userAgent.toLowerCase();

  const platform =
    ua.includes("android")
      ? "Android"
      : ua.includes("iphone") ||
          ua.includes("ipad")
        ? "iPhone/iPad"
        : ua.includes("windows")
          ? "Windows"
          : ua.includes("mac os")
            ? "macOS"
            : ua.includes("linux")
              ? "Linux"
              : "Устройство";

  const browser =
    ua.includes("edg/")
      ? "Edge"
      : ua.includes("firefox/")
        ? "Firefox"
        : ua.includes("chrome/")
          ? "Chrome"
          : ua.includes("safari/")
            ? "Safari"
            : "Браузер";

  return `${platform} · ${browser}`;
}

function showMessenger() {
  authScreen.classList.add("hidden");
  messengerScreen.classList.remove("hidden");

  setAvatarElement(
    selfAvatar,
    state.user?.display_name ||
      state.user?.displayName ||
      state.user?.email ||
      state.user?.phone,
    state.user?.avatar_key ||
      state.user?.avatarKey,
  );

  // Start loading chats first. A non-critical composer error must
  // never leave the sidebar empty after a page refresh.
  loadChats();
  loadContactsData();
  connectSocket();
  updateComposerAction();
  processInviteFromUrl();
}

async function performLogout(all = false) {
  try {
    await request(
      all
        ? "/auth/logout-all"
        : "/auth/logout",
      {
        method: "POST",
        auth: all,
        retryAuth: false,
      },
    );
  } catch {
    // Local logout must always be possible.
  }

  clearLocalSession();
  clearAppPin();
  state.chats = [];
  updateBrowserUnreadBadge();
  settingsModal.classList.add("hidden");
  messengerScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
  showAuthMode("login");
}
/* SOCKET */

function connectSocket() {
  if (state.socket || !window.io) return;

  state.socket = window.io("/chat", {
    auth: { token: state.token },
    transports: ["websocket", "polling"],
  });

  state.socket.on("connect", () => {
    if (state.activeChat) chatStatus.textContent = "в сети";
  });

  state.socket.on("auth.error", async () => {
    const refreshed = await refreshAccessToken();

    if (refreshed === "ok") {
      state.socket?.disconnect();
      state.socket = null;
      connectSocket();
      return;
    }

    if (refreshed === "unauthorized") {
      clearLocalSession();
      messengerScreen.classList.add("hidden");
      authScreen.classList.remove("hidden");
      showAuthMode("login");
    }
  });

  state.socket.on("message.new", (message) => {
    const isActive =
      state.activeChat?.id ===
      message.chat_id;
    const incoming =
      message.sender_id !==
      state.user?.id;

    if (
      incoming &&
      !activeChatMuteStatus(
        message.chat_id,
      )
    ) {
      playAppSound("receive");
    }

    if (isActive) {
      const added =
        addActiveMessage(message);

      if (added) {
        appendMessage(message);
        scrollMessages();
      } else {
        updateMessageReceipt(
          message.id,
          message.receipt_status,
        );
      }

      if (
        incoming &&
        document.visibilityState ===
          "visible" &&
        document.hasFocus()
      ) {
        markActiveChatRead(
          message.chat_id,
        );
      }
    }

    if (
      !isActive ||
      !incoming ||
      document.visibilityState !==
        "visible" ||
      !document.hasFocus()
    ) {
      loadChats(false);
    }
  });

  state.socket.on(
    "message.receipt",
    ({ chatId, messageIds, status }) => {
      if (!Array.isArray(messageIds)) return;

      for (const messageId of messageIds) {
        const message = state.activeMessages.find(
          (item) => item.id === messageId,
        );

        if (message) {
          message.receipt_status =
            advancedReceiptStatus(
              message.receipt_status,
              status,
            );
        }

        updateMessageReceipt(
          messageId,
          status,
        );
      }

      if (state.activeChat?.id === chatId) {
        loadChats(false);
      }
    },
  );

  state.socket.on(
    "friend.request",
    () => {
      loadContactsData();
      loadChats(false);
    },
  );

  state.socket.on(
    "friend.accepted",
    () => {
      loadContactsData();
      loadChats(false);
    },
  );

  state.socket.on(
    "friend.declined",
    () => {
      loadContactsData();
      loadChats(false);
    },
  );

  state.socket.on(
    "friend.cancelled",
    () => {
      loadContactsData();
      loadChats(false);
    },
  );

  state.socket.on(
    "friend.removed",
    () => {
      loadContactsData();
      loadChats(false);

      if (state.profileTarget?.id) {
        openUserProfile(
          state.profileTarget.id,
        );
      }
    },
  );

  state.socket.on(
    "user.block.changed",
    async ({
      blockerId,
      blockedId,
      blocked,
    }) => {
      if (
        blockerId === state.user?.id
      ) {
        if (
          state.profileTarget?.id ===
          blockedId
        ) {
          state.profileTarget.is_blocked =
            blocked === true;
          applyUserProfileBlockState(
            state.profileTarget,
          );
        }

        if (
          !settingsModal.classList.contains(
            "hidden",
          )
        ) {
          await loadBlockedUsers();
        }
      }

      loadChats(false);
    },
  );

  state.socket.on(
    "chat.settings",
    ({ chatId, settings }) => {
      const chat = state.chats.find((item) => item.id === chatId);
      if (chat) Object.assign(chat, settings);
      if (state.activeChat?.id === chatId) { Object.assign(state.activeChat, settings); updateActiveChatAccess(); }
    },
  );

  state.socket.on(
    "chat.member-role",
    ({ chatId, userId, role }) => {
      if (chatId === state.activeChat?.id && userId === state.user?.id) { state.activeChat.role = role; updateActiveChatAccess(); }
      loadChats(false);
    },
  );

  state.socket.on(
    "chat.created",
    () => {
      loadChats(false);
    },
  );

  state.socket.on(
    "chat.deleted",
    ({
      chatId,
      userId,
    }) => {
      if (
        userId !== state.user?.id
      ) {
        return;
      }

      resetChatPaneAfterDelete(
        chatId,
      );

      state.chats =
        state.chats.filter(
          (chat) =>
            chat.id !== chatId,
        );

      renderChats();
    },
  );

  state.socket.on(
    "message.deleted",
    ({
      chatId,
      messageId,
      scope,
    }) => {
      if (
        state.activeChat?.id ===
        chatId
      ) {
        if (scope === "everyone") {
          markMessageDeletedForEveryone(
            messageId,
          );
        } else {
          removeMessageFromCurrentView(
            messageId,
          );
        }
      }

      loadChats(false);
    },
  );

  state.socket.on(
    "message.restored",
    ({ chatId, messageId, message }) => {
      if (
        state.activeChat?.id === chatId &&
        messageId &&
        message
      ) {
        replaceMessageInCurrentView(
          messageId,
          {
            ...message,
            metadata: {
              ...(message.metadata || {}),
              deletedForEveryone: false,
              deletedForEveryoneAt: null,
              restoreUntil: null,
            },
          },
        );
      }

      loadChats(false);
    },
  );

  state.socket.on(
    "activity.changed",
    ({ chatId, userId, action }) => {
      if (
        state.activeChat?.id !== chatId ||
        userId === state.user?.id
      ) return;

      displayRemoteActivity(action);
    },
  );

  state.socket.on(
    "chat.cleared",
    ({ chatId, userId }) => {
      if (
        userId !== state.user?.id
      ) {
        return;
      }

      if (
        state.activeChat?.id ===
        chatId
      ) {
        state.activeMessages = [];
        messageArea.innerHTML =
          '<div class="empty-chat-history">История чата очищена</div>';
        closeDialogSearch(false);
      }

      loadChats(false);
    },
  );

  state.socket.on(
    "message.reaction",
    ({ chatId, messageId, reactions }) => {
      if (state.activeChat?.id !== chatId) return;
      renderMessageReactions(messageId, reactions);
    },
  );

  state.socket.on("chat.read", ({ chatId, userId }) => {
    if (userId === state.user?.id) {
      setChatUnreadCount(chatId, 0);
    }
  });

  state.socket.on("typing.changed", ({ chatId, typing }) => {
    if (state.activeChat?.id === chatId && !state.remoteActivity) {
      displayRemoteActivity(typing ? "typing" : null);
    }
  });

  state.socket.on("presence.changed", ({ userId, online }) => {
    if (state.activeChat?.peer?.id === userId) {
      state.activeChat.peer.online = online;
      if (!state.remoteActivity) {
        chatStatus.textContent = online ? "в сети" : "был(а) недавно";
      }
    }
  });

  setInterval(() => state.socket?.emit("presence.ping"), 30000);
}

/* CHATS */

function setSidebarMode(mode) {
  state.sidebarMode = mode;

  chatsTabButton.classList.toggle(
    "active",
    mode === "chats",
  );
  contactsTabButton.classList.toggle(
    "active",
    mode === "contacts",
  );
  requestsTabButton.classList.toggle(
    "active",
    mode === "requests",
  );

  chatList.classList.toggle(
    "hidden",
    mode !== "chats",
  );
  contactList.classList.toggle(
    "hidden",
    mode !== "contacts",
  );
  requestList.classList.toggle(
    "hidden",
    mode !== "requests",
  );

  searchResults.classList.add("hidden");
  searchInput.value = "";

  searchInput.placeholder =
    mode === "contacts"
      ? "Имя, номер, @username или email"
      : mode === "requests"
        ? "Запросы в контакты"
        : "Поиск или новый чат";

  searchInput.disabled =
    mode === "requests";

  if (mode === "contacts") {
    renderContacts();
  }

  if (mode === "requests") {
    renderFriendRequests();
  }
}

async function loadContactsData() {
  const [contactsResult, requestsResult] =
    await Promise.allSettled([
      request("/contacts"),
      request("/contacts/requests"),
    ]);

  if (contactsResult.status === "fulfilled") {
    state.contacts = Array.isArray(
      contactsResult.value,
    )
      ? contactsResult.value
      : [];
  } else {
    console.warn(
      "Unable to load contacts",
      contactsResult.reason,
    );
    state.contacts = [];
  }

  if (requestsResult.status === "fulfilled") {
    const requests = requestsResult.value;

    state.friendRequests = {
      incoming: Array.isArray(
        requests?.incoming,
      )
        ? requests.incoming
        : [],
      outgoing: Array.isArray(
        requests?.outgoing,
      )
        ? requests.outgoing
        : [],
    };
  } else {
    console.warn(
      "Unable to load contact requests",
      requestsResult.reason,
    );
    state.friendRequests = {
      incoming: [],
      outgoing: [],
    };
  }

  const incomingCount =
    state.friendRequests.incoming.length;

  requestsBadge.textContent =
    incomingCount > 99
      ? "99+"
      : String(incomingCount);
  requestsBadge.classList.toggle(
    "hidden",
    incomingCount === 0,
  );

  renderContacts();
  renderFriendRequests();
}

function sidebarArrowMarkup() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 10 5 5 5-5"/>
    </svg>
  `;
}

function closeSidebarRowMenus(
  except = null,
) {
  document
    .querySelectorAll(
      ".sidebar-row-menu:not(.hidden)",
    )
    .forEach((menu) => {
      if (menu !== except) {
        menu.classList.add("hidden");
      }
    });
}

function toggleSidebarRowMenu(menu) {
  const shouldOpen =
    menu.classList.contains("hidden");

  closeSidebarRowMenus(
    shouldOpen ? menu : null,
  );

  menu.classList.toggle(
    "hidden",
    !shouldOpen,
  );
}


function renderContacts(query = "") {
  const clean =
    query.trim().toLowerCase();

  const contacts =
    state.contacts.filter(
      (contact) =>
        !clean ||
        String(
          contact.custom_name || "",
        )
          .toLowerCase()
          .includes(clean) ||
        String(contact.username || "")
          .toLowerCase()
          .includes(clean) ||
        String(contact.phone || "")
          .includes(clean) ||
        String(contact.email || "")
          .toLowerCase()
          .includes(clean),
    );

  contactList.innerHTML =
    contacts.length
      ? contacts
          .map((contact) => {
            const title =
              contact.custom_name ||
              contact.display_name;

            return `
              <div class="sidebar-list-row">
                <button
                  type="button"
                  class="chat-item contact-item"
                  data-contact-user-id="${contact.id}"
                >
                  ${avatarMarkup(
                    title,
                    contact.avatar_key,
                  )}

                  <div class="chat-item-content">
                    <div class="chat-name">
                      ${escapeHtml(title)}
                    </div>

                    <div class="chat-preview">
                      ${
                        contact.username
                          ? `@${escapeHtml(
                              contact.username,
                            )}`
                          : escapeHtml(
                              contact.phone || "",
                            )
                      }
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  class="sidebar-row-menu-button"
                  data-contact-row-menu="${contact.id}"
                  title="Действия с контактом"
                >
                  ${sidebarArrowMarkup()}
                </button>

                <div
                  class="sidebar-row-menu hidden"
                  data-contact-menu="${contact.id}"
                >
                  <button
                    type="button"
                    class="sidebar-menu-danger"
                    data-remove-contact-id="${contact.id}"
                  >
                    Удалить из друзей
                  </button>
                </div>
              </div>
            `;
          })
          .join("")
      : '<div class="empty-list">Контактов пока нет</div>';

  contactList
    .querySelectorAll(
      "[data-contact-user-id]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          closeSidebarRowMenus();
          await openPrivateChatWithUser(
            button.dataset.contactUserId,
          );
        },
      );
    });

  contactList
    .querySelectorAll(
      "[data-contact-row-menu]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();

          const menu =
            contactList.querySelector(
              `[data-contact-menu="${CSS.escape(
                button.dataset
                  .contactRowMenu,
              )}"]`,
            );

          if (menu) {
            toggleSidebarRowMenu(menu);
          }
        },
      );
    });

  contactList
    .querySelectorAll(
      "[data-remove-contact-id]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();

          const contact =
            state.contacts.find(
              (item) =>
                item.id ===
                button.dataset
                  .removeContactId,
            );

          if (!contact) return;

          closeSidebarRowMenus();

          openFriendRemoveConfirmation(
            {
              id: contact.id,
              is_friend: true,
              real_display_name:
                contact.custom_name ||
                contact.display_name,
              display_name:
                contact.display_name,
            },
            false,
          );
        },
      );
    });
}

function renderFriendRequests() {
  const incoming =
    state.friendRequests.incoming;
  const outgoing =
    state.friendRequests.outgoing;

  const requestCard = (
    item,
    direction,
  ) => {
    const incomingRequest =
      direction === "incoming";

    return `
      <div class="sidebar-list-row request-list-row">
        <div class="friend-request-card">
          ${avatarMarkup(
            item.display_name,
            item.avatar_key,
            "avatar request-avatar",
          )}

          <div class="friend-request-content">
            <strong>${escapeHtml(
              item.display_name,
            )}</strong>
            <span>
              ${
                incomingRequest
                  ? item.username
                    ? `@${escapeHtml(
                        item.username,
                      )}`
                    : "Хочет добавить вас в контакты"
                  : "Ожидает подтверждения"
              }
            </span>
          </div>
        </div>

        <button
          type="button"
          class="sidebar-row-menu-button"
          data-request-row-menu="${item.id}"
          title="Действия с запросом"
        >
          ${sidebarArrowMarkup()}
        </button>

        <div
          class="sidebar-row-menu hidden"
          data-request-menu="${item.id}"
        >
          ${
            incomingRequest
              ? `
                <button
                  type="button"
                  data-accept-request="${item.id}"
                >
                  Принять
                </button>

                <button
                  type="button"
                  class="sidebar-menu-danger"
                  data-decline-request="${item.id}"
                >
                  Отклонить
                </button>
              `
              : `
                <button
                  type="button"
                  class="sidebar-menu-danger"
                  data-cancel-request="${item.id}"
                >
                  Отменить запрос
                </button>
              `
          }
        </div>
      </div>
    `;
  };

  requestList.innerHTML = `
    <div class="request-section-title">
      Входящие
    </div>

    ${
      incoming.length
        ? incoming
            .map((item) =>
              requestCard(
                item,
                "incoming",
              ),
            )
            .join("")
        : '<div class="empty-list compact-empty">Нет входящих запросов</div>'
    }

    <div class="request-section-title outgoing-title">
      Отправленные
    </div>

    ${
      outgoing.length
        ? outgoing
            .map((item) =>
              requestCard(
                item,
                "outgoing",
              ),
            )
            .join("")
        : '<div class="empty-list compact-empty">Нет отправленных запросов</div>'
    }
  `;

  requestList
    .querySelectorAll(
      "[data-request-row-menu]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();

          const menu =
            requestList.querySelector(
              `[data-request-menu="${CSS.escape(
                button.dataset
                  .requestRowMenu,
              )}"]`,
            );

          if (menu) {
            toggleSidebarRowMenu(menu);
          }
        },
      );
    });

  requestList
    .querySelectorAll(
      "[data-accept-request]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          closeSidebarRowMenus();
          await answerFriendRequest(
            button.dataset.acceptRequest,
            true,
          );
        },
      );
    });

  requestList
    .querySelectorAll(
      "[data-decline-request]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          closeSidebarRowMenus();
          await answerFriendRequest(
            button.dataset.declineRequest,
            false,
          );
        },
      );
    });

  requestList
    .querySelectorAll(
      "[data-cancel-request]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          closeSidebarRowMenus();
          await cancelFriendRequest(
            button.dataset.cancelRequest,
          );
        },
      );
    });
}

async function answerFriendRequest(
  requestId,
  accept,
) {
  try {
    await request(
      `/contacts/requests/${requestId}/${
        accept ? "accept" : "decline"
      }`,
      { method: "POST" },
    );

    await Promise.all([
      loadContactsData(),
      loadChats(false),
    ]);

    if (state.profileTarget?.request_id === requestId) {
      await openUserProfile(
        state.profileTarget.id,
      );
    }
  } catch (error) {
    alert(error.message);
  }
}

async function cancelFriendRequest(
  requestId,
) {
  try {
    await request(
      `/contacts/requests/${requestId}`,
      {
        method: "DELETE",
      },
    );

    await loadContactsData();
  } catch (error) {
    alert(error.message);
  }
}


async function openPrivateChatWithUser(userId) {
  try {
    const chat = await request(
      "/chats/private",
      {
        method: "POST",
        body: JSON.stringify({
          otherUserId: userId,
        }),
      },
    );

    await loadChats(false);

    const current =
      state.chats.find(
        (item) => item.id === chat.id,
      ) || chat;

    setSidebarMode("chats");
    openChat(current);
  } catch (error) {
    alert(error.message);
  }
}

function openContactRequest(profile) {
  state.contactRequestTarget = profile;
  contactRequestStatus.textContent = "";
  contactRequestTargetLabel.textContent =
    profile.real_display_name ||
    profile.realDisplayName ||
    profile.display_name ||
    profile.displayName ||
    "Пользователь";
  contactRequestNameInput.value =
    profile.display_name ||
    profile.displayName ||
    profile.real_display_name ||
    profile.realDisplayName ||
    "";
  contactRequestModal.classList.remove(
    "hidden",
  );

  requestAnimationFrame(() => {
    contactRequestNameInput.focus();
    contactRequestNameInput.select();
  });
}

async function sendContactRequest() {
  const target =
    state.contactRequestTarget;

  if (!target?.id) return;

  const contactName =
    contactRequestNameInput.value.trim();

  if (!contactName) {
    contactRequestStatus.textContent =
      "Введите имя контакта";
    return;
  }

  contactRequestSendButton.disabled = true;
  contactRequestStatus.textContent =
    "Отправляем запрос…";

  try {
    await request("/contacts/request", {
      method: "POST",
      body: JSON.stringify({
        userId: target.id,
        contactName,
      }),
    });

    contactRequestModal.classList.add(
      "hidden",
    );
    await Promise.all([
      loadContactsData(),
      loadChats(false),
    ]);

    if (state.profileTarget?.id === target.id) {
      await openUserProfile(target.id);
    }
  } catch (error) {
    contactRequestStatus.textContent =
      error.message;

    if (
      error.code ===
      "INCOMING_REQUEST_EXISTS"
    ) {
      setSidebarMode("requests");
      contactRequestModal.classList.add(
        "hidden",
      );
    }
  } finally {
    contactRequestSendButton.disabled = false;
  }
}

function openFriendRemoveConfirmation(
  profile = state.profileTarget,
  reopenProfile = true,
) {
  if (!profile?.id || !profile.is_friend) {
    return;
  }

  state.friendRemoveTarget = {
    ...profile,
    reopenProfile,
  };
  friendRemoveTargetLabel.textContent =
    profile.real_display_name ||
    profile.display_name ||
    "Пользователь";
  friendRemoveConfirmInput.value = "";
  friendRemoveStatus.textContent = "";
  friendRemoveModal.classList.remove(
    "hidden",
  );

  requestAnimationFrame(() => {
    friendRemoveConfirmInput.focus();
  });
}

function closeFriendRemoveConfirmation() {
  friendRemoveModal.classList.add(
    "hidden",
  );
  friendRemoveConfirmInput.value = "";
  friendRemoveStatus.textContent = "";
  state.friendRemoveTarget = null;
}

async function confirmFriendRemoval() {
  const target =
    state.friendRemoveTarget;
  const confirmation =
    friendRemoveConfirmInput.value
      .trim()
      .toLocaleLowerCase("ru-RU");

  if (!target?.id) return;

  if (confirmation !== "да") {
    friendRemoveStatus.textContent =
      "Для удаления напишите «Да»";
    friendRemoveConfirmInput.focus();
    return;
  }

  friendRemoveConfirm.disabled = true;
  friendRemoveStatus.textContent =
    "Удаляем из друзей…";

  try {
    await request(
      `/contacts/${target.id}`,
      {
        method: "DELETE",
      },
    );

    closeFriendRemoveConfirmation();

    await Promise.all([
      loadContactsData(),
      loadChats(false),
    ]);

    if (
      state.activeChat?.peer?.id ===
      target.id
    ) {
      const updatedChat =
        state.chats.find(
          (chat) =>
            chat.id ===
            state.activeChat.id,
        );

      if (updatedChat) {
        state.activeChat =
          updatedChat;
        updateActiveChatAccess();
      }
    }

    if (target.reopenProfile) {
      await openUserProfile(target.id);
    } else if (
      state.profileTarget?.id ===
      target.id
    ) {
      closeUserProfilePanel();
    }
  } catch (error) {
    friendRemoveStatus.textContent =
      error.message;
  } finally {
    friendRemoveConfirm.disabled =
      false;
  }
}


let userProfileCloseTimer = null;

function closeUserProfilePanel(immediate = false) {
  if (
    userProfileModal.classList.contains(
      "hidden",
    )
  ) {
    return;
  }

  clearTimeout(userProfileCloseTimer);

  if (immediate) {
    userProfileModal.classList.add("hidden");
    userProfileModal.classList.remove(
      "profile-panel-visible",
      "profile-panel-closing",
    );
    messengerScreen.classList.remove(
      "user-profile-panel-open",
    );
    return;
  }

  userProfileModal.classList.remove(
    "profile-panel-visible",
  );
  userProfileModal.classList.add(
    "profile-panel-closing",
  );

  messengerScreen.classList.remove(
    "user-profile-panel-open",
  );

  userProfileCloseTimer = setTimeout(() => {
    userProfileModal.classList.add("hidden");
    userProfileModal.classList.remove(
      "profile-panel-closing",
    );
  }, 260);
}

function showUserProfilePanel() {
  clearTimeout(userProfileCloseTimer);

  userProfileModal.classList.remove(
    "hidden",
    "profile-panel-closing",
  );

  messengerScreen.classList.add(
    "user-profile-panel-open",
  );

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      userProfileModal.classList.add(
        "profile-panel-visible",
      );
    });
  });
}

async function openUserProfile(userId) {
  if (!userId) return;

  showUserProfilePanel();
  viewProfileStatus.textContent =
    "Загружаем профиль…";

  try {
    const [
      profile,
      blockStatus,
    ] = await Promise.all([
      request(
        `/users/${userId}/profile`,
      ),
      request(
        `/blocks/${userId}/status`,
      ),
    ]);

    profile.is_blocked =
      blockStatus.isBlocked === true;

    state.profileTarget = profile;

    setAvatarElement(
      viewProfileAvatar,
      profile.display_name,
      profile.avatar_key,
    );

    viewProfileName.textContent =
      profile.display_name ||
      "Пользователь";
    viewProfileUsername.textContent =
      profile.username
        ? `@${profile.username}`
        : "";
    viewProfileBio.textContent =
      profile.bio ||
      "Описание не заполнено";
    viewProfilePhone.textContent =
      profile.phone || "Скрыт";
    viewProfileEmail.textContent =
      profile.email || "Скрыт";

    viewProfilePrivacyHint.textContent =
      profile.can_view_private
        ? "Контактные данные доступны"
        : "Чтобы увидеть телефон и email, отправьте запрос в контакты.";

    viewProfileRelationship.textContent =
      profile.is_friend
        ? "В контактах"
        : profile.request_direction ===
            "outgoing"
          ? "Запрос отправлен"
          : profile.request_direction ===
              "incoming"
            ? "Входящий запрос"
            : "Не в контактах";

    viewProfileContactButton.classList.toggle(
      "hidden",
      profile.is_friend ||
        profile.request_direction ===
          "incoming",
    );
    viewProfileContactButton.disabled =
      profile.request_direction ===
      "outgoing";
    viewProfileContactButton.textContent =
      profile.request_direction ===
      "outgoing"
        ? "Запрос отправлен"
        : "Добавить в контакты";

    viewProfileAcceptButton.classList.toggle(
      "hidden",
      profile.request_direction !==
        "incoming",
    );

    viewProfileRemoveButton.classList.toggle(
      "hidden",
      !profile.is_friend,
    );

    applyUserProfileBlockState(
      profile,
    );

    viewProfileStatus.textContent = "";
  } catch (error) {
    viewProfileStatus.textContent =
      error.message;
  }
}

function applyUserProfileBlockState(
  profile = state.profileTarget,
) {
  if (!profile) return;

  const blocked =
    profile.is_blocked === true;

  viewProfileBlockButton.classList.toggle(
    "unblock-mode",
    blocked,
  );

  viewProfileBlockButton.textContent =
    blocked
      ? "Разблокировать пользователя"
      : "Заблокировать пользователя";

  viewProfileContactButton.classList.toggle(
    "hidden",
    blocked ||
      profile.is_friend ||
      profile.request_direction ===
        "incoming",
  );

  viewProfileContactButton.disabled =
    blocked ||
    profile.request_direction ===
      "outgoing";

  viewProfileContactButton.textContent =
    profile.request_direction ===
      "outgoing"
      ? "Запрос отправлен"
      : "Добавить в контакты";

  viewProfileAcceptButton.classList.toggle(
    "hidden",
    blocked ||
      profile.request_direction !==
        "incoming",
  );

  if (blocked) {
    viewProfileRelationship.textContent =
      "Заблокирован";

    viewProfilePrivacyHint.textContent =
      "Пользователь заблокирован. Личные сообщения и новые запросы контакта недоступны.";
    return;
  }

  viewProfileRelationship.textContent =
    profile.is_friend
      ? "В контактах"
      : profile.request_direction ===
          "outgoing"
        ? "Запрос отправлен"
        : profile.request_direction ===
            "incoming"
          ? "Входящий запрос"
          : "Не в контактах";

  viewProfilePrivacyHint.textContent =
    profile.can_view_private
      ? "Контактные данные доступны"
      : "Чтобы увидеть телефон и email, отправьте запрос в контакты.";
}

async function toggleProfileBlock() {
  const profile =
    state.profileTarget;

  if (!profile?.id) return;

  const currentlyBlocked =
    profile.is_blocked === true;

  if (
    !currentlyBlocked &&
    !window.confirm(
      `Заблокировать пользователя «${profile.display_name || "Пользователь"}»?`,
    )
  ) {
    return;
  }

  viewProfileBlockButton.disabled = true;
  viewProfileStatus.textContent =
    currentlyBlocked
      ? "Разблокируем…"
      : "Блокируем…";

  try {
    await request(
      `/blocks/${profile.id}`,
      {
        method: currentlyBlocked
          ? "DELETE"
          : "POST",
      },
    );

    const resultMessage =
      currentlyBlocked
        ? "Пользователь разблокирован"
        : "Пользователь заблокирован";

    await Promise.all([
      loadChats(false),
      loadContactsData(),
    ]);

    if (
      !settingsModal.classList.contains(
        "hidden",
      )
    ) {
      await loadBlockedUsers();
    }

    await openUserProfile(
      profile.id,
    );

    viewProfileStatus.textContent =
      resultMessage;
  } catch (error) {
    viewProfileStatus.textContent =
      error.message;
  } finally {
    viewProfileBlockButton.disabled = false;
  }
}

function renderBlockedUsers() {
  const users =
    Array.isArray(state.blockedUsers)
      ? state.blockedUsers
      : [];

  blockedUsersSection.classList.toggle(
    "hidden",
    users.length === 0,
  );

  blockedUsersCount.textContent =
    users.length
      ? String(users.length)
      : "";

  if (!users.length) {
    blockedUsersList.innerHTML = "";
    return;
  }

  blockedUsersList.innerHTML =
    users
      .map(
        (user) => `
          <article
            class="blocked-user-row"
            data-blocked-user-id="${escapeHtml(
              user.id,
            )}"
          >
            ${avatarMarkup(
              user.display_name,
              user.avatar_key,
              "avatar blocked-user-avatar",
            )}

            <div class="blocked-user-data">
              <strong>${escapeHtml(
                user.display_name ||
                  "Пользователь",
              )}</strong>
              <span>${
                user.username
                  ? `@${escapeHtml(
                      user.username,
                    )}`
                  : "Без username"
              }</span>
            </div>

            <button
              type="button"
              class="blocked-user-unblock"
              data-unblock-user-id="${escapeHtml(
                user.id,
              )}"
            >
              Разблокировать
            </button>
          </article>
        `,
      )
      .join("");

  blockedUsersList
    .querySelectorAll(
      "[data-unblock-user-id]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const userId =
            button.dataset
              .unblockUserId;

          if (!userId) return;

          button.disabled = true;
          button.textContent =
            "Разблокируем…";

          try {
            await request(
              `/blocks/${userId}`,
              {
                method: "DELETE",
              },
            );

            state.blockedUsers =
              state.blockedUsers.filter(
                (item) =>
                  item.id !== userId,
              );

            renderBlockedUsers();

            if (
              state.profileTarget?.id ===
              userId
            ) {
              await openUserProfile(
                userId,
              );

              viewProfileStatus.textContent =
                "Пользователь разблокирован";
            }
          } catch (error) {
            profileStatus.textContent =
              error.message;
            button.disabled = false;
            button.textContent =
              "Разблокировать";
          }
        },
      );
    });
}

async function loadBlockedUsers() {
  try {
    const users =
      await request("/blocks");

    state.blockedUsers =
      Array.isArray(users)
        ? users
        : [];

    renderBlockedUsers();
  } catch (error) {
    state.blockedUsers = [];
    renderBlockedUsers();
    profileStatus.textContent =
      error.message ||
      "Не удалось загрузить список блокировок";
  }
}

function isEmojiOnlyText(value) {
  const normalized = String(value || "").trim();
  return Boolean(normalized) && /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\s]+$/u.test(normalized);
}

function currentChatPermissions(chat = state.activeChat) {
  const all = { text: true, reactions: true, voice: true, media: true, files: true };
  if (!chat || chat.type === "private" || ["owner", "admin"].includes(chat.role)) return all;
  return {
    text: chat.members_can_send_text !== false,
    reactions: chat.members_can_send_reactions !== false,
    voice: chat.members_can_send_voice !== false,
    media: chat.members_can_send_media !== false,
    files: chat.members_can_send_files !== false,
  };
}

function permissionSummary(permissions) {
  const allowed = [];
  if (permissions.text) allowed.push("текст");
  if (permissions.reactions) allowed.push("эмодзи, GIF и стикеры");
  if (permissions.voice) allowed.push("голосовые");
  if (permissions.media) allowed.push("фото и видео");
  if (permissions.files) allowed.push("файлы");
  return allowed;
}

function updateActiveChatAccess() {
  const chat = state.activeChat;
  if (!chat) return;
  const permissions = currentChatPermissions(chat);
  state.activePermissions = permissions;
  const peer = chat.peer;
  const limited = chat.type === "private" && peer && !peer.isFriend;
  const remaining = limited ? Math.max(0, Number(peer.remainingMessages ?? 3)) : null;

  privateLimitBar.classList.toggle("hidden", !limited);
  if (limited) {
    privateLimitText.textContent = remaining > 0
      ? `Пользователь не в контактах. Можно отправить ещё: ${remaining}`
      : "Лимит из трёх сообщений исчерпан. Для продолжения добавьте пользователя в контакты.";
    privateLimitContactButton.textContent = peer.friendshipStatus === "outgoing"
      ? "Запрос отправлен"
      : peer.friendshipStatus === "incoming" ? "Принять запрос" : "Добавить в контакты";
    privateLimitContactButton.disabled = peer.friendshipStatus === "outgoing";
  }

  const isCommunityMember = ["group", "channel"].includes(chat.type) && !["owner", "admin"].includes(chat.role);
  const allowedNames = permissionSummary(permissions);
  communityPermissionBar.classList.toggle("hidden", !isCommunityMember || allowedNames.length === 5);
  if (isCommunityMember) {
    communityPermissionText.textContent = allowedNames.length
      ? `Вам разрешено: ${allowedNames.join(", ")}`
      : "Владелец запретил участникам отправлять сообщения";
  }

  const anyCommunityPermission = Object.values(permissions).some(Boolean);
  const canUseComposer = (!limited || remaining > 0) && anyCommunityPermission;
  composer.classList.toggle("hidden", !canUseComposer);
  messageInput.disabled = !permissions.text && !permissions.reactions;
  messageInput.placeholder = permissions.text
    ? "Введите сообщение"
    : permissions.reactions
      ? "Доступны только эмодзи"
      : "Текстовые сообщения запрещены";
  emojiButton.disabled = !permissions.reactions;
  attachmentButton.disabled = !permissions.media && !permissions.files;
  attachmentMenu.querySelectorAll("[data-attachment-action]").forEach((button) => {
    const action = button.dataset.attachmentAction;
    const allowed = ["media", "camera", "video-camera"].includes(action) ? permissions.media : permissions.files;
    button.classList.toggle("hidden", !allowed);
  });

  chatAddContactButton.classList.toggle("hidden", chat.type !== "private" || !peer || peer.isFriend);
  chatAddContactButton.disabled = peer?.friendshipStatus === "outgoing";
  chatAddContactButton.title = peer?.friendshipStatus === "outgoing"
    ? "Запрос в контакты уже отправлен"
    : peer?.friendshipStatus === "incoming" ? "Принять входящий запрос" : "Добавить в контакты";
  updateComposerAction();
}

function decrementPrivateAllowance() {
  const peer = state.activeChat?.peer;

  if (
    state.activeChat?.type !== "private" ||
    !peer ||
    peer.isFriend
  ) {
    return;
  }

  peer.remainingMessages = Math.max(
    0,
    Number(peer.remainingMessages ?? 3) - 1,
  );

  updateActiveChatAccess();
}

function communityRoleLabel(member) {
  if (member.role === "owner") return "владелец";
  if (member.role === "admin") return "администратор";
  if (member.username) return `@${member.username}`;
  return "участник";
}

function openCommunityMemberAction(member) {
  const info = state.managedCommunityInfo;
  if (!info?.canManage || member.role === "owner") return;

  state.communityActionMember = member;
  communityMemberActionName.textContent = member.display_name || "Участник";
  communityMemberActionRole.textContent = communityRoleLabel(member);
  setAvatarElement(
    communityMemberActionAvatar,
    member.display_name || "Участник",
    member.avatar_key,
  );

  const baseRole = info.type === "channel" ? "subscriber" : "member";
  const nextRole = member.role === "admin" ? baseRole : "admin";
  communityMemberRoleButton.dataset.nextRole = nextRole;
  communityMemberRoleButton.textContent = member.role === "admin"
    ? "Снять права администратора"
    : "Назначить администратором";

  const actorIsOwner = info.viewer_role === "owner";
  const canModerate = actorIsOwner || member.role !== "admin";
  communityMemberRoleButton.classList.toggle("hidden", !actorIsOwner);
  communityMemberRemoveButton.classList.toggle("hidden", !canModerate);
  communityMemberBanButton.classList.toggle("hidden", !canModerate);
  communityMemberActionStatus.textContent = "";
  communityMemberActionModal.classList.remove("hidden");
}

function communityRoleLabel(member) {
  if (member.role === "owner") return "владелец";
  if (member.role === "admin") return "администратор";
  if (member.username) return `@${member.username}`;
  return "участник";
}

function openCommunityMemberAction(member) {
  const info = state.managedCommunityInfo;
  if (!info?.canManage || member.role === "owner") return;

  state.communityActionMember = member;
  communityMemberActionName.textContent = member.display_name || "Участник";
  communityMemberActionRole.textContent = communityRoleLabel(member);
  setAvatarElement(
    communityMemberActionAvatar,
    member.display_name || "Участник",
    member.avatar_key,
  );

  const baseRole = info.type === "channel" ? "subscriber" : "member";
  const nextRole = member.role === "admin" ? baseRole : "admin";
  communityMemberRoleButton.dataset.nextRole = nextRole;
  communityMemberRoleButton.textContent = member.role === "admin"
    ? "Снять права администратора"
    : "Назначить администратором";

  const actorIsOwner = info.viewer_role === "owner";
  const canModerate = actorIsOwner || member.role !== "admin";
  communityMemberRoleButton.classList.toggle("hidden", !actorIsOwner);
  communityMemberRemoveButton.classList.toggle("hidden", !canModerate);
  communityMemberBanButton.classList.toggle("hidden", !canModerate);
  communityMemberActionStatus.textContent = "";
  communityMemberActionModal.classList.remove("hidden");
}

function communityRoleLabel(member) {
  if (member.role === "owner") return "владелец";
  if (member.role === "admin") return "администратор";
  if (member.username) return `@${member.username}`;
  return "участник";
}

function openCommunityMemberAction(member) {
  const info = state.managedCommunityInfo;
  if (!info?.canManage || member.role === "owner") return;

  state.communityActionMember = member;
  communityMemberActionName.textContent = member.display_name || "Участник";
  communityMemberActionRole.textContent = communityRoleLabel(member);
  setAvatarElement(
    communityMemberActionAvatar,
    member.display_name || "Участник",
    member.avatar_key,
  );

  const baseRole = info.type === "channel" ? "subscriber" : "member";
  const nextRole = member.role === "admin" ? baseRole : "admin";
  communityMemberRoleButton.dataset.nextRole = nextRole;
  communityMemberRoleButton.textContent = member.role === "admin"
    ? "Снять права администратора"
    : "Назначить администратором";

  const actorIsOwner = info.viewer_role === "owner";
  const canModerate = actorIsOwner || member.role !== "admin";
  communityMemberRoleButton.classList.toggle("hidden", !actorIsOwner);
  communityMemberRemoveButton.classList.toggle("hidden", !canModerate);
  communityMemberBanButton.classList.toggle("hidden", !canModerate);
  communityMemberActionStatus.textContent = "";
  communityMemberActionModal.classList.remove("hidden");
}

function communityRoleLabel(member) {
  if (member.role === "owner") return "владелец";
  if (member.role === "admin") return "администратор";
  if (member.username) return `@${member.username}`;
  return "участник";
}

function openCommunityMemberAction(member) {
  const info = state.managedCommunityInfo;
  if (!info?.canManage || member.role === "owner") return;

  state.communityActionMember = member;
  communityMemberActionName.textContent = member.display_name || "Участник";
  communityMemberActionRole.textContent = communityRoleLabel(member);
  setAvatarElement(
    communityMemberActionAvatar,
    member.display_name || "Участник",
    member.avatar_key,
  );

  const baseRole = info.type === "channel" ? "subscriber" : "member";
  const nextRole = member.role === "admin" ? baseRole : "admin";
  communityMemberRoleButton.dataset.nextRole = nextRole;
  communityMemberRoleButton.textContent = member.role === "admin"
    ? "Снять права администратора"
    : "Назначить администратором";

  const actorIsOwner = info.viewer_role === "owner";
  const canModerate = actorIsOwner || member.role !== "admin";
  communityMemberRoleButton.classList.toggle("hidden", !actorIsOwner);
  communityMemberRemoveButton.classList.toggle("hidden", !canModerate);
  communityMemberBanButton.classList.toggle("hidden", !canModerate);
  communityMemberActionStatus.textContent = "";
  communityMemberActionModal.classList.remove("hidden");
}

function renderCommunityManageMembers(info) {
  if (!info || typeof info !== "object") {
    communityMembersVisibilityHint.textContent =
      "Не удалось загрузить участников";
    communityMembersList.innerHTML =
      '<div class="telegram-hidden-members">Обновите информацию сообщества</div>';
    return;
  }

  if (!info.canViewMembers) {
    communityMembersVisibilityHint.textContent = "Список скрыт владельцем";
    communityMembersList.innerHTML = '<div class="telegram-hidden-members">Участники скрыты</div>';
    return;
  }

  communityMembersVisibilityHint.textContent = `${info.member_count} участников`;
  const members = Array.isArray(info.members) ? info.members : [];

  communityMembersList.innerHTML = members.length
    ? members.map((member) => {
        const manageable = info.canManage && member.role !== "owner";
        return `<div class="telegram-member-row ${manageable ? "community-member-clickable" : ""}" ${manageable ? `data-community-member-open="${member.id}"` : ""}>
          ${avatarMarkup(member.display_name, member.avatar_key, "avatar telegram-member-avatar")}
          <div class="telegram-member-data">
            <strong>${escapeHtml(member.display_name)}</strong>
            <span>${escapeHtml(communityRoleLabel(member))}</span>
          </div>
          ${manageable ? '<button type="button" class="community-member-more" aria-label="Управление">⋮</button>' : ""}
        </div>`;
      }).join("")
    : '<div class="telegram-hidden-members">Участников пока нет</div>';

  communityMembersList.querySelectorAll("[data-community-member-open]").forEach((row) => {
    row.addEventListener("click", () => {
      const member = members.find((item) => item.id === row.dataset.communityMemberOpen);
      if (member) openCommunityMemberAction(member);
    });
  });
}

function applyCommunityInfo(info) {
  state.managedCommunityInfo = info;
  const title = info.title || "Сообщество";
  communityManageTitle.textContent = info.type === "channel" ? "Информация о канале" : "Информация о группе";
  communityManageType.textContent = info.linked_chat_id ? "Связанное сообщество" : info.type === "channel" ? "Канал" : "Группа";
  communityManageName.textContent = title;
  communityManageDescription.textContent = info.description || "Описание не заполнено";
  communityManageUsername.textContent = info.username ? `@${info.username}` : "";
  communityManageMemberCount.textContent = `${info.member_count} участников`;
  communityManageRole.textContent = info.viewer_role === "owner" ? "Вы владелец" : info.viewer_role === "admin" ? "Вы администратор" : "Вы участник";
  setAvatarElement(communityManageAvatar, title, info.avatar_key);
  communitySettingsControls.classList.toggle("hidden", !info.canEditSettings);
  communityInviteControls.classList.toggle("hidden", !info.canManage);
  communityMembersVisibleInput.checked = Boolean(info.members_visible);
  permissionTextInput.checked = Boolean(info.members_can_send_text);
  permissionReactionsInput.checked = Boolean(info.members_can_send_reactions);
  permissionVoiceInput.checked = Boolean(info.members_can_send_voice);
  permissionMediaInput.checked = Boolean(info.members_can_send_media);
  permissionFilesInput.checked = Boolean(info.members_can_send_files);
  renderCommunityManageMembers(info);

  communityBansSection.classList.toggle("hidden", !info.canManage);
  communityLeaveButton.classList.toggle("hidden", info.viewer_role === "owner");
  communityDeleteButton.classList.toggle("hidden", info.viewer_role !== "owner");

  const linked = Boolean(info.linked_chat_id);
  const noun = info.type === "channel" ? "канал" : "группу";
  communityLeaveButton.textContent = linked
    ? "Покинуть канал и группу"
    : `Покинуть ${noun}`;
  communityDeleteButton.textContent = linked
    ? "Удалить канал и группу"
    : `Удалить ${noun}`;
}

async function openCommunityManage(chat) {
  state.managedCommunity = chat;
  communityManageModal.classList.remove("hidden");
  communityManageStatus.textContent = "Загружаем…";
  communityMembersList.innerHTML = '<div class="loading">Загружаем участников…</div>';
  try {
    const info = await request(`/chats/${chat.id}/community`);
    applyCommunityInfo(info);
    communityManageStatus.textContent = "";
    if (info.canManage) {
      await Promise.all([
        loadCommunityInvites(),
        loadCommunityBans(),
      ]);
    } else {
      state.communityBans = [];
      renderCommunityBans();
    }
  } catch (error) { communityManageStatus.textContent = error.message; }
}

async function saveCommunitySettings() {
  const chat = state.managedCommunity;
  if (!chat) return;
  saveCommunitySettingsButton.disabled = true;
  saveCommunitySettingsButton.textContent = "Сохраняем…";
  communityManageStatus.textContent = "";
  try {
    const info = await request(`/chats/${chat.id}/community/settings`, {method:"PATCH", body:JSON.stringify({membersVisible:communityMembersVisibleInput.checked,membersCanSendText:permissionTextInput.checked,membersCanSendReactions:permissionReactionsInput.checked,membersCanSendVoice:permissionVoiceInput.checked,membersCanSendMedia:permissionMediaInput.checked,membersCanSendFiles:permissionFilesInput.checked})});
    applyCommunityInfo(info);
    const settings={members_visible:info.members_visible,members_can_send_text:info.members_can_send_text,members_can_send_reactions:info.members_can_send_reactions,members_can_send_voice:info.members_can_send_voice,members_can_send_media:info.members_can_send_media,members_can_send_files:info.members_can_send_files};
    const current=state.chats.find((item)=>item.id===chat.id); if(current)Object.assign(current,settings); if(state.activeChat?.id===chat.id){Object.assign(state.activeChat,settings);updateActiveChatAccess();}
    communityManageStatus.textContent="Права сохранены";
  } catch(error){communityManageStatus.textContent=error.message;} finally {saveCommunitySettingsButton.disabled=false;saveCommunitySettingsButton.textContent="Сохранить права";}
}

async function updateCommunityMemberRole(userId, role) {
  const chat=state.managedCommunity;if(!chat)return;communityManageStatus.textContent="Обновляем роль…";
  try{const info=await request(`/chats/${chat.id}/members/${userId}/role`,{method:"PATCH",body:JSON.stringify({role})});applyCommunityInfo(info);communityManageStatus.textContent=role==="admin"?"Администратор назначен":"Права администратора сняты";}catch(error){communityManageStatus.textContent=error.message;}
}

function renderCommunityBans() {
  const users = Array.isArray(state.communityBans) ? state.communityBans : [];
  communityBansCount.textContent = users.length ? String(users.length) : "0";
  communityBansList.innerHTML = users.length
    ? users.map((user) => `<div class="community-blacklist-row">
        ${avatarMarkup(user.display_name, user.avatar_key, "avatar telegram-member-avatar")}
        <div class="community-blacklist-data">
          <strong>${escapeHtml(user.display_name || "Пользователь")}</strong>
          <span>${user.username ? `@${escapeHtml(user.username)}` : "Заблокирован"}</span>
        </div>
        <button type="button" class="community-unban-button" data-community-unban="${user.id}">Разблокировать</button>
      </div>`).join("")
    : '<div class="telegram-hidden-members">Чёрный список пуст</div>';

  communityBansList.querySelectorAll("[data-community-unban]").forEach((button) => {
    button.addEventListener("click", () => unbanCommunityMember(button.dataset.communityUnban, button));
  });
}

async function loadCommunityBans() {
  const chat = state.managedCommunity;
  if (!chat) return;
  try {
    const users = await request(`/chats/${chat.id}/bans`);
    state.communityBans = Array.isArray(users) ? users : [];
    renderCommunityBans();
  } catch (error) {
    communityManageStatus.textContent = error.message;
  }
}

async function moderateCommunityMember(action) {
  const chat = state.managedCommunity;
  const member = state.communityActionMember;
  if (!chat || !member) return;

  const isBan = action === "ban";
  const question = isBan
    ? `Удалить «${member.display_name}» и добавить в чёрный список? Пользователь больше не сможет войти по ссылке.`
    : `Удалить «${member.display_name}» из сообщества? Он сможет войти снова по ссылке.`;
  if (!(await window.MeetusConfirm(question, {
    danger: true,
    confirmText: isBan ? "Заблокировать" : "Удалить",
  }))) return;

  communityMemberActionStatus.textContent = isBan ? "Блокируем…" : "Удаляем…";
  try {
    const info = await request(
      isBan
        ? `/chats/${chat.id}/bans/${member.id}`
        : `/chats/${chat.id}/members/${member.id}`,
      { method: isBan ? "POST" : "DELETE" },
    );
    applyCommunityInfo(info);
    communityMemberActionModal.classList.add("hidden");
    communityManageStatus.textContent = isBan
      ? "Пользователь добавлен в чёрный список"
      : "Пользователь удалён. Он сможет присоединиться снова";
    if (isBan) await loadCommunityBans();
  } catch (error) {
    communityMemberActionStatus.textContent = error.message;
  }
}

async function unbanCommunityMember(userId, button) {
  const chat = state.managedCommunity;
  if (!chat || !userId) return;
  button.disabled = true;
  button.textContent = "Разблокируем…";
  try {
    await request(`/chats/${chat.id}/bans/${userId}`, { method: "DELETE" });
    state.communityBans = state.communityBans.filter((item) => item.id !== userId);
    renderCommunityBans();
    communityManageStatus.textContent = "Пользователь удалён из чёрного списка";
  } catch (error) {
    communityManageStatus.textContent = error.message;
    button.disabled = false;
    button.textContent = "Разблокировать";
  }
}

function removeCommunityChatsLocally(chatIds) {
  const ids = new Set(chatIds || []);
  state.chats = state.chats.filter((chat) => !ids.has(chat.id));
  if (state.activeChat && ids.has(state.activeChat.id)) {
    state.activeChat = null;
    state.activeMessages = [];
    messenger.classList.remove("chat-open");
  }
  renderChats();
}

async function leaveManagedCommunity() {
  const chat = state.managedCommunity;
  const info = state.managedCommunityInfo;
  if (!chat || !info) return;
  const text = info.linked_chat_id
    ? "Покинуть канал и связанную группу? История останется на сервере, но сообщество исчезнет из ваших чатов."
    : "Покинуть это сообщество?";
  if (!(await window.MeetusConfirm(text, {
    danger: false,
    title: "Покинуть сообщество?",
    confirmText: "Покинуть",
  }))) return;

  communityLeaveButton.disabled = true;
  try {
    const result = await request(`/chats/${chat.id}/leave`, { method: "POST" });
    removeCommunityChatsLocally(result.removedChatIds);
    communityManageModal.classList.add("hidden");
  } catch (error) {
    communityManageStatus.textContent = error.message;
  } finally {
    communityLeaveButton.disabled = false;
  }
}

async function deleteManagedCommunity() {
  const chat = state.managedCommunity;
  const info = state.managedCommunityInfo;
  if (!chat || !info) return;
  const text = info.linked_chat_id
    ? "Навсегда удалить канал, связанную группу, сообщения и участников? Отменить это действие нельзя."
    : "Навсегда удалить сообщество и всю историю сообщений?";
  if (!(await window.MeetusConfirm(text, {
    danger: true,
    title: "Удалить сообщество?",
    confirmText: "Продолжить",
  }))) return;
  if (!(await window.MeetusConfirm("Это действие необратимо. Подтвердите окончательное удаление.", {
    danger: true,
    title: "Последнее подтверждение",
    confirmText: "Удалить навсегда",
  }))) return;

  communityDeleteButton.disabled = true;
  try {
    const result = await request(`/chats/${chat.id}/community`, { method: "DELETE" });
    removeCommunityChatsLocally(result.removedChatIds);
    communityManageModal.classList.add("hidden");
  } catch (error) {
    communityManageStatus.textContent = error.message;
  } finally {
    communityDeleteButton.disabled = false;
  }
}

async function loadCommunityInvites() {
  const chat = state.managedCommunity;

  if (!chat) return;

  try {
    const links = await request(
      `/chats/${chat.id}/invites`,
    );

    inviteLinksList.innerHTML =
      links.length
        ? links
            .map(
              (link) => `
                <div class="invite-link-card ${
                  link.active ? "" : "expired"
                }">
                  <div>
                    <strong>
                      ${link.active ? "Активная ссылка" : "Неактивная ссылка"}
                    </strong>
                    <span>
                      Использовано ${link.use_count} из ${link.max_uses}
                      • до ${escapeHtml(
                        new Date(
                          link.expires_at,
                        ).toLocaleDateString(
                          "ru-RU",
                        ),
                      )}
                    </span>
                  </div>

                  <div class="invite-link-actions">
                    ${
                      link.active
                        ? `
                          <button
                            type="button"
                            class="secondary-button compact"
                            data-copy-invite="${escapeHtml(link.url)}"
                          >
                            Копировать
                          </button>

                          <button
                            type="button"
                            class="danger-button compact"
                            data-revoke-invite="${link.id}"
                          >
                            Отключить
                          </button>
                        `
                        : ""
                    }
                  </div>
                </div>
              `,
            )
            .join("")
        : '<div class="empty-list compact-empty">Ссылок пока нет</div>';

    inviteLinksList
      .querySelectorAll(
        "[data-copy-invite]",
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          async () => {
            await navigator.clipboard.writeText(
              button.dataset.copyInvite,
            );
            communityManageStatus.textContent =
              "Ссылка скопирована";
          },
        );
      });

    inviteLinksList
      .querySelectorAll(
        "[data-revoke-invite]",
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          async () => {
            await request(
              `/chats/${chat.id}/invites/${button.dataset.revokeInvite}`,
              { method: "DELETE" },
            );
            await loadCommunityInvites();
          },
        );
      });
  } catch (error) {
    communityManageStatus.textContent =
      error.message;
  }
}

async function searchCommunityInviteUsers(
  query,
) {
  const clean = query.trim();

  if (clean.length < 2) {
    communityInviteUserResults.innerHTML =
      "";
    return;
  }

  try {
    const users = await request(
      `/users/search?q=${encodeURIComponent(clean)}`,
    );

    communityInviteUserResults.innerHTML =
      users.length
        ? users
            .map(
              (user) => `
                <button
                  type="button"
                  class="community-search-user"
                  data-invite-user="${user.id}"
                >
                  ${avatarMarkup(
                    user.display_name,
                    user.avatar_key,
                    "avatar community-user-avatar",
                  )}
                  <span>
                    <strong>${escapeHtml(user.display_name)}</strong>
                    <small>${
                      user.username
                        ? `@${escapeHtml(user.username)}`
                        : escapeHtml(user.phone || "")
                    }</small>
                  </span>
                </button>
              `,
            )
            .join("")
        : '<div class="empty-list compact-empty">Ничего не найдено</div>';

    communityInviteUserResults
      .querySelectorAll(
        "[data-invite-user]",
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          async () => {
            await inviteUserToCommunity(
              button.dataset.inviteUser,
            );
          },
        );
      });
  } catch (error) {
    communityInviteUserResults.innerHTML =
      `<div class="empty-list">${escapeHtml(error.message)}</div>`;
  }
}

async function inviteUserToCommunity(userId) {
  const chat = state.managedCommunity;

  if (!chat) return;

  try {
    await request(
      `/chats/${chat.id}/members`,
      {
        method: "POST",
        body: JSON.stringify({
          userId,
        }),
      },
    );

    communityInviteUserSearch.value = "";
    communityInviteUserResults.innerHTML =
      "";
    communityManageStatus.textContent =
      "Пользователь добавлен";
  } catch (error) {
    communityManageStatus.textContent =
      error.message;
  }
}

async function createCommunityInvite() {
  const chat = state.managedCommunity;

  if (!chat) return;

  const maxUses = Number(
    inviteMaxUsesInput.value,
  );
  const expiresDays = Number(
    inviteDaysInput.value,
  );

  if (
    !Number.isInteger(maxUses) ||
    maxUses < 1
  ) {
    communityManageStatus.textContent =
      "Укажите количество приглашённых";
    return;
  }

  if (
    !Number.isInteger(expiresDays) ||
    expiresDays < 1
  ) {
    communityManageStatus.textContent =
      "Укажите срок действия в днях";
    return;
  }

  createInviteLinkButton.disabled = true;
  communityManageStatus.textContent =
    "Создаём ссылку…";

  try {
    const link = await request(
      `/chats/${chat.id}/invites`,
      {
        method: "POST",
        body: JSON.stringify({
          maxUses,
          expiresDays,
        }),
      },
    );

    createdInviteUrl.value = link.url;
    createdInviteBox.classList.remove(
      "hidden",
    );
    communityManageStatus.textContent =
      "Ссылка создана";

    await loadCommunityInvites();
  } catch (error) {
    communityManageStatus.textContent =
      error.message;
  } finally {
    createInviteLinkButton.disabled = false;
  }
}

async function processInviteFromUrl() {
  const match = location.pathname.match(
    /^\/invite\/([A-Za-z0-9_-]+)\/?$/,
  );

  if (!match) return;

  const token = match[1];

  try {
    const result = await request(
      `/invites/${encodeURIComponent(token)}/join`,
      { method: "POST" },
    );

    history.replaceState({}, "", "/");
    await loadChats(false);

    const chat =
      state.chats.find(
        (item) =>
          item.id === result.primary?.id,
      ) ||
      state.chats.find(
        (item) =>
          item.id === result.primary?.chat_id,
      );

    if (chat) {
      openChat(chat);
    }
  } catch (error) {
    history.replaceState({}, "", "/");
    alert(error.message);
  }
}

let meetusFaviconLink = null;

function totalUnreadMessages() {
  return state.chats.reduce(
    (total, chat) =>
      total + unreadCount(chat),
    0,
  );
}

function updateBrowserUnreadBadge() {
  const total =
    totalUnreadMessages();
  const label =
    total > 99
      ? "99+"
      : total > 0
        ? String(total)
        : "";

  document.title = label
    ? `(${label}) Meetus Messenger`
    : "Meetus Messenger";

  try {
    const canvas =
      document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context =
      canvas.getContext("2d");

    context.clearRect(0, 0, 64, 64);
    context.fillStyle = "#8774e1";
    context.beginPath();
    context.arc(32, 32, 27, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#fff";
    context.font = "700 31px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("M", 32, 34);

    if (label) {
      context.fillStyle = "#2aabee";
      context.beginPath();
      context.arc(49, 15, 14, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#fff";
      context.font =
        label.length > 2
          ? "700 9px Arial"
          : "700 13px Arial";
      context.fillText(label, 49, 16);
    }

    if (!meetusFaviconLink) {
      meetusFaviconLink =
        document.querySelector(
          'link[rel~="icon"]',
        );

      if (!meetusFaviconLink) {
        meetusFaviconLink =
          document.createElement("link");
        meetusFaviconLink.rel = "icon";
        document.head.appendChild(
          meetusFaviconLink,
        );
      }
    }

    meetusFaviconLink.href =
      canvas.toDataURL("image/png");
  } catch (error) {
    console.warn(
      "Unread badge error",
      error,
    );
  }
}


async function loadChats(showLoading = true) {
  if (showLoading) {
    chatList.innerHTML = '<div class="loading">Загружаем чаты…</div>';
  }

  try {
    const activeId =
      state.activeChat?.id;

    state.chats = await request("/chats");

    if (activeId) {
      const refreshed =
        state.chats.find(
          (item) => item.id === activeId,
        );

      if (refreshed) {
        state.activeChat = refreshed;
        updateActiveChatAccess();
      }
    }

    renderChats();
  } catch (error) {
    chatList.innerHTML = `<div class="empty-list">${escapeHtml(error.message)}</div>`;
  }
}

function unreadCount(chat) {
  return Math.max(
    0,
    Number(chat?.unread_count || 0),
  );
}

function setChatUnreadCount(chatId, count) {
  const chat = state.chats.find(
    (item) => item.id === chatId,
  );

  if (!chat) return;

  chat.unread_count = Math.max(
    0,
    Number(count || 0),
  );

  renderChats();
}

function chatPreview(chat) {
  if (chat.last_message_text) return chat.last_message_text;

  return {
    image: "Фото",
    video: "Видео",
    voice: "Голосовое сообщение",
    file: "Файл",
    gif: "GIF",
    sticker: "Стикер",
  }[chat.last_message_kind] || "Сообщений пока нет";
}

function renderChats() {
  if (!state.chats.length) {
    chatList.innerHTML =
      '<div class="empty-list">Чатов пока нет.<br>Найдите пользователя через поиск.</div>';
    updateBrowserUnreadBadge();
    return;
  }

  chatList.innerHTML =
    state.chats
      .map((chat) => {
        const title =
          chat.peer?.displayName ||
          chat.title ||
          "Чат";
        const activeClass =
          state.activeChat?.id ===
          chat.id
            ? "active"
            : "";
        const unread =
          unreadCount(chat);
        const avatarKey =
          chat.peer?.avatarKey ||
          chat.avatar_key;

        return `
          <div
            class="sidebar-list-row chat-sidebar-row ${activeClass}"
          >
            <button
              type="button"
              class="chat-item ${activeClass} ${unread ? "has-unread" : ""}"
              data-chat-id="${chat.id}"
            >
              ${avatarMarkup(
                title,
                avatarKey,
              )}

              <div class="chat-item-content">
                <div class="chat-item-line">
                  <div class="chat-name">
                    ${escapeHtml(title)}
                  </div>

                  <div class="chat-time">
                    ${escapeHtml(
                      formatTime(
                        chat.last_message_at ||
                          chat.updated_at,
                      ),
                    )}
                  </div>
                </div>

                <div class="chat-preview-line">
                  <div class="chat-preview">
                    ${escapeHtml(
                      chatPreview(chat),
                    )}
                  </div>

                  ${
                    unread
                      ? `
                        <span
                          class="chat-unread-badge"
                          aria-label="Непрочитанных сообщений: ${unread}"
                        >
                          ${unread > 99 ? "99+" : unread}
                        </span>
                      `
                      : ""
                  }
                </div>
              </div>
            </button>

            <button
              type="button"
              class="sidebar-row-menu-button"
              data-chat-row-menu="${chat.id}"
              title="Действия с чатом"
            >
              ${sidebarArrowMarkup()}
            </button>

            <div
              class="sidebar-row-menu hidden"
              data-chat-menu="${chat.id}"
            >
              <button
                type="button"
                class="sidebar-menu-danger"
                data-delete-chat-id="${chat.id}"
              >
                Удалить чат
              </button>
            </div>
          </div>
        `;
      })
      .join("");

  chatList
    .querySelectorAll(
      ".chat-item[data-chat-id]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          closeSidebarRowMenus();

          const chat =
            state.chats.find(
              (item) =>
                item.id ===
                button.dataset.chatId,
            );

          if (chat) openChat(chat);
        },
      );
    });

  chatList
    .querySelectorAll(
      "[data-chat-row-menu]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();

          const menu =
            chatList.querySelector(
              `[data-chat-menu="${CSS.escape(
                button.dataset
                  .chatRowMenu,
              )}"]`,
            );

          if (menu) {
            toggleSidebarRowMenu(menu);
          }
        },
      );
    });

  chatList
    .querySelectorAll(
      "[data-delete-chat-id]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();

          const chat =
            state.chats.find(
              (item) =>
                item.id ===
                button.dataset
                  .deleteChatId,
            );

          if (!chat) return;

          closeSidebarRowMenus();
          openChatDeleteConfirmation(
            chat,
          );
        },
      );
    });

  updateBrowserUnreadBadge();
}

async function openChat(chat) {
  clearLocalChatActivity();
  state.remoteActivity = null;
  if (state.remoteActivityTimer) {
    clearTimeout(state.remoteActivityTimer);
    state.remoteActivityTimer = null;
  }
  closeUserProfilePanel();
  closeSharedChatPanel();
  closeChatHeaderMenu();
  state.activeChat = chat;
  state.activeMessages = [];
  state.searchContextActive = false;
  closeDialogSearch(false);

  messengerScreen.classList.add("chat-open");
  emptyState.classList.add("hidden");
  messageArea.classList.remove("hidden");
  recordBar.classList.add("hidden");

  const title = chat.peer?.displayName || chat.title || "Чат";
  chatTitle.textContent = title;
  chatStatus.textContent =
    chat.type === "channel"
      ? "канал"
      : chat.type === "group"
        ? "группа"
        : "загрузка…";
  setAvatarElement(
    chatAvatar,
    title,
    chat.peer?.avatarKey ||
      chat.avatar_key,
  );

  updateActiveChatAccess();
  updateChatMuteMenuLabel();

  chat.unread_count = 0;
  renderChats();
  messageArea.innerHTML = '<div class="loading">Загружаем сообщения…</div>';

  try {
    const messages = await request(`/chats/${chat.id}/messages`);
    state.activeMessages = messages;

    messageArea.innerHTML = "";
    messages.forEach(appendMessage);
    scrollMessages(true);

    state.socket?.emit("chat.join", {
      chatId: chat.id,
    });
    await markActiveChatRead(
      chat.id,
      true,
    );
    chatStatus.textContent =
      chat.type === "channel"
        ? (
            chat.linked_chat_id
              ? "канал • есть группа обсуждения"
              : "канал"
          )
        : chat.type === "group"
          ? (
              chat.linked_chat_id
                ? "группа обсуждения"
                : "группа"
            )
          : "в сети";
  } catch (error) {
    messageArea.innerHTML = `<div class="empty-list">${escapeHtml(error.message)}</div>`;
  }
}

/* SEARCH */

function searchChatTitle(chat) {
  return (
    chat?.peer?.displayName ||
    chat?.title ||
    "Чат"
  );
}

function searchChatAvatar(chat) {
  return (
    chat?.peer?.avatarKey ||
    chat?.avatar_key ||
    null
  );
}

function searchMessageText(result) {
  return (
    result.text ||
    result.file_name ||
    {
      image: "Фотография",
      video: "Видео",
      voice: "Голосовое сообщение",
      file: "Документ",
      gif: "GIF",
      sticker: "Стикер",
    }[result.kind] ||
    "Сообщение"
  );
}

function searchResultDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const sameDay =
    date.toDateString() === now.toDateString();

  return sameDay
    ? date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year:
          date.getFullYear() ===
          now.getFullYear()
            ? undefined
            : "numeric",
      });
}

function globalSearchSection(
  title,
  content,
  count,
) {
  return `
    <section class="global-search-section">
      <div class="global-search-heading">
        <strong>${escapeHtml(title)}</strong>
        ${
          Number.isFinite(count)
            ? `<span>${count}</span>`
            : ""
        }
      </div>
      ${content}
    </section>
  `;
}

async function performSearch(query) {
  const clean = query.trim();

  if (clean.length < 2) {
    searchResults.classList.add("hidden");
    searchResults.innerHTML = "";
    return;
  }

  searchResults.innerHTML =
    '<div class="search-loading">Ищем в чатах и сообщениях…</div>';
  searchResults.classList.remove("hidden");

  try {
    const [searchData, users] =
      await Promise.all([
        request(
          `/search?q=${encodeURIComponent(clean)}`
        ),
        request(
          `/users/search?q=${encodeURIComponent(clean)}`
        ),
      ]);

    const chats = Array.isArray(
      searchData?.chats,
    )
      ? searchData.chats
      : [];
    const messages = Array.isArray(
      searchData?.messages,
    )
      ? searchData.messages
      : [];
    const people = Array.isArray(users)
      ? users
      : [];

    const chatMarkup = chats.length
      ? chats
          .map((chat) => {
            const title =
              searchChatTitle(chat);

            return `
              <button
                type="button"
                class="global-search-row"
                data-search-chat-id="${chat.id}"
              >
                ${avatarMarkup(
                  title,
                  searchChatAvatar(chat),
                  "avatar global-search-avatar",
                )}

                <span class="global-search-row-content">
                  <strong>${escapeHtml(title)}</strong>
                  <small>${
                    chat.type === "channel"
                      ? "Канал"
                      : chat.type === "group"
                        ? "Группа"
                        : chat.peer?.username
                          ? `@${escapeHtml(chat.peer.username)}`
                          : "Личный чат"
                  }</small>
                </span>
              </button>
            `;
          })
          .join("")
      : '<div class="search-section-empty">Совпадений по чатам нет</div>';

    const messageMarkup = messages.length
      ? messages
          .map((message) => {
            const chat =
              message.chat || {};
            const title =
              searchChatTitle(chat);

            return `
              <button
                type="button"
                class="global-search-row message-search-row"
                data-search-message-id="${message.id}"
                data-search-message-chat-id="${message.chat_id}"
              >
                ${avatarMarkup(
                  title,
                  searchChatAvatar(chat),
                  "avatar global-search-avatar",
                )}

                <span class="global-search-row-content">
                  <span class="global-search-title-line">
                    <strong>${escapeHtml(title)}</strong>
                    <time>${escapeHtml(searchResultDate(message.created_at))}</time>
                  </span>
                  <small>${escapeHtml(searchMessageText(message))}</small>
                </span>
              </button>
            `;
          })
          .join("")
      : '<div class="search-section-empty">Сообщения не найдены</div>';

    const peopleMarkup = people.length
      ? people
          .map(
            (user) => `
              <button
                type="button"
                class="global-search-row"
                data-search-user-id="${user.id}"
              >
                ${avatarMarkup(
                  user.display_name,
                  user.avatar_key,
                  "avatar global-search-avatar",
                )}

                <span class="global-search-row-content">
                  <strong>${escapeHtml(user.display_name)}</strong>
                  <small>${
                    user.username
                      ? `@${escapeHtml(user.username)}`
                      : escapeHtml(
                          user.email ||
                          user.phone ||
                          "Пользователь",
                        )
                  }</small>
                </span>
              </button>
            `,
          )
          .join("")
      : '<div class="search-section-empty">Новых пользователей не найдено</div>';

    searchResults.innerHTML = `
      <div class="global-search-tabs">
        <button type="button" class="active">Все</button>
        <button type="button">Чаты</button>
        <button type="button">Сообщения</button>
      </div>

      ${globalSearchSection(
        "Чаты и каналы",
        chatMarkup,
        chats.length,
      )}

      ${globalSearchSection(
        "Сообщения",
        messageMarkup,
        messages.length,
      )}

      ${globalSearchSection(
        "Пользователи",
        peopleMarkup,
        people.length,
      )}
    `;

    searchResults
      .querySelectorAll(
        "[data-search-chat-id]",
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () =>
            openChatFromSearch(
              button.dataset.searchChatId,
            ),
        );
      });

    searchResults
      .querySelectorAll(
        "[data-search-message-id]",
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () =>
            openSearchMessageResult(
              button.dataset.searchMessageChatId,
              button.dataset.searchMessageId,
            ),
        );
      });

    searchResults
      .querySelectorAll(
        "[data-search-user-id]",
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () =>
            createChat(
              button.dataset.searchUserId,
            ),
        );
      });
  } catch (error) {
    searchResults.innerHTML =
      `<div class="empty-list">${escapeHtml(error.message)}</div>`;
  }
}

async function openChatFromSearch(chatId) {
  let chat = state.chats.find(
    (item) => item.id === chatId,
  );

  if (!chat) {
    await loadChats(false);
    chat = state.chats.find(
      (item) => item.id === chatId,
    );
  }

  if (!chat) return;

  searchInput.value = "";
  searchResults.classList.add("hidden");
  setSidebarMode("chats");
  await openChat(chat);
}

async function openSearchMessageResult(
  chatId,
  messageId,
) {
  let chat = state.chats.find(
    (item) => item.id === chatId,
  );

  if (!chat) {
    await loadChats(false);
    chat = state.chats.find(
      (item) => item.id === chatId,
    );
  }

  if (!chat) return;

  searchInput.value = "";
  searchResults.classList.add("hidden");
  setSidebarMode("chats");

  await openChat(chat);

  let target = messageArea.querySelector(
    `[data-message-id="${CSS.escape(messageId)}"]`,
  );

  if (!target) {
    try {
      const context = await request(
        `/chats/${chatId}/messages/${messageId}/context?limit=100`,
      );

      state.activeMessages = context;
      state.searchContextActive = true;
      messageArea.innerHTML = "";
      context.forEach(appendMessage);

      target = messageArea.querySelector(
        `[data-message-id="${CSS.escape(messageId)}"]`,
      );
    } catch (error) {
      alert(error.message);
      return;
    }
  }

  if (target) {
    requestAnimationFrame(() => {
      scrollToMessage(messageId);
      target.classList.add(
        "message-search-target",
      );
      setTimeout(
        () =>
          target.classList.remove(
            "message-search-target",
          ),
        2200,
      );
    });
  }
}


function openDialogSearch() {
  if (!state.activeChat) return;

  state.dialogSearchChatId =
    state.activeChat.id;

  chatSearchPanel.classList.remove(
    "hidden",
  );
  chatSearchResults.classList.add(
    "hidden",
  );
  chatSearchInput.value = "";
  chatSearchInput.placeholder =
    `Поиск только в «${chatTitleValue(
      state.activeChat,
    )}»`;
  chatSearchCount.textContent =
    "Только сообщения этого чата";

  requestAnimationFrame(() =>
    chatSearchInput.focus(),
  );
}

async function closeDialogSearch(
  restoreLatest = true,
) {
  clearTimeout(state.dialogSearchTimer);
  chatSearchPanel.classList.add("hidden");
  chatSearchResults.classList.add("hidden");
  chatSearchInput.value = "";
  chatSearchCount.textContent = "";
  state.dialogSearchResults = [];
  state.dialogSearchChatId = null;

  if (
    restoreLatest &&
    state.searchContextActive &&
    state.activeChat
  ) {
    const chat = state.activeChat;
    state.searchContextActive = false;
    await openChat(chat);
  }
}

async function performDialogSearch(query) {
  const chat = state.activeChat;
  const searchChatId =
    state.dialogSearchChatId;
  const clean = query.trim();

  if (
    !chat ||
    !searchChatId ||
    chat.id !== searchChatId ||
    clean.length < 2
  ) {
    state.dialogSearchResults = [];
    chatSearchCount.textContent = "";
    chatSearchResults.classList.add(
      "hidden",
    );
    chatSearchResults.innerHTML = "";
    return;
  }

  chatSearchResults.innerHTML =
    '<div class="search-loading">Ищем сообщения…</div>';
  chatSearchResults.classList.remove(
    "hidden",
  );

  try {
    const results = await request(
      `/chats/${searchChatId}/search?q=${encodeURIComponent(clean)}&limit=100`,
    );

    if (
      state.dialogSearchChatId !==
        searchChatId ||
      state.activeChat?.id !==
        searchChatId
    ) {
      return;
    }

    state.dialogSearchResults =
      Array.isArray(results)
        ? results
        : [];
    chatSearchCount.textContent =
      state.dialogSearchResults.length
        ? `В этом чате найдено: ${state.dialogSearchResults.length}`
        : "В этом чате ничего не найдено";

    chatSearchResults.innerHTML =
      state.dialogSearchResults.length
        ? state.dialogSearchResults
            .map(
              (message) => `
                <button
                  type="button"
                  class="dialog-search-result"
                  data-dialog-message-id="${message.id}"
                >
                  ${avatarMarkup(
                    message.sender_name ||
                      "Пользователь",
                    message.sender_avatar_key,
                    "avatar dialog-search-avatar",
                  )}

                  <span>
                    <span class="global-search-title-line">
                      <strong>${escapeHtml(
                        message.sender_name ||
                        "Пользователь",
                      )}</strong>
                      <time>${escapeHtml(
                        searchResultDate(
                          message.created_at,
                        ),
                      )}</time>
                    </span>
                    <small>${escapeHtml(
                      searchMessageText(message),
                    )}</small>
                  </span>
                </button>
              `,
            )
            .join("")
        : '<div class="search-section-empty">Совпадений в этом диалоге нет</div>';

    chatSearchResults
      .querySelectorAll(
        "[data-dialog-message-id]",
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          async () => {
            chatSearchResults.classList.add(
              "hidden",
            );

            await openSearchMessageResult(
              searchChatId,
              button.dataset.dialogMessageId,
            );

            chatSearchPanel.classList.remove(
              "hidden",
            );
            chatSearchInput.value = clean;
            chatSearchCount.textContent =
              `В этом чате найдено: ${state.dialogSearchResults.length}`;
          },
        );
      });
  } catch (error) {
    chatSearchResults.innerHTML =
      `<div class="empty-list">${escapeHtml(error.message)}</div>`;
  }
}


async function createChat(otherUserId) {
  try {
    const chat = await request("/chats/private", {
      method: "POST",
      body: JSON.stringify({ otherUserId }),
    });

    searchInput.value = "";
    searchResults.classList.add("hidden");

    await loadChats(false);

    const fullChat =
      state.chats.find((item) => item.id === chat.id) || chat;

    openChat(fullChat);
  } catch (error) {
    alert(error.message);
  }
}

/* EMOJI / GIF / STICKER PICKER */

function toggleContentPicker(force) {
  const shouldOpen =
    typeof force === "boolean"
      ? force
      : contentPicker.classList.contains("hidden");

  contentPicker.classList.toggle("hidden", !shouldOpen);
  emojiButton.classList.toggle("active", shouldOpen);

  if (shouldOpen) {
    toggleAttachmentMenu(false);
    renderContentPicker();
    if (state.pickerTab === "gif") setLocalChatActivity("gif", 7000);
  } else if (state.localActivity === "gif") {
    clearLocalChatActivity();
  }
}

function setPickerTab(tab) {
  state.pickerTab = tab;

  contentPicker
    .querySelectorAll("[data-picker-tab]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.pickerTab === tab,
      );
    });

  const searchable = tab === "gif";
  contentPickerSearchRow.classList.toggle(
    "hidden",
    !searchable,
  );
  contentPickerSearch.placeholder = "Поиск GIF";

  renderContentPicker();

  if (searchable) {
    setLocalChatActivity("gif", 7000);
    requestAnimationFrame(() =>
      contentPickerSearch.focus(),
    );
  } else if (state.localActivity === "gif") {
    clearLocalChatActivity();
  }
}

function renderContentPicker() {
  contentPickerStatus.textContent = "";

  if (state.pickerTab === "emoji") {
    contentPickerBody.className =
      "content-picker-body emoji-picker-grid";
    contentPickerBody.innerHTML = BUILT_IN_EMOJIS
      .map(
        (emoji) => `
          <button type="button" data-insert-emoji="${emoji}">
            ${emoji}
          </button>
        `,
      )
      .join("");

    contentPickerBody
      .querySelectorAll("[data-insert-emoji]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          insertTextAtCursor(
            messageInput,
            button.dataset.insertEmoji,
          );
          updateComposerAction();
        });
      });

    return;
  }

  if (state.pickerTab === "sticker") {
    contentPickerBody.className =
      "content-picker-body sticker-picker-grid";
    contentPickerBody.innerHTML = BUILT_IN_STICKERS
      .map(
        (emoji) => `
          <button
            type="button"
            class="built-in-sticker"
            data-send-sticker="${emoji}"
          >
            ${emoji}
          </button>
        `,
      )
      .join("");

    contentPickerBody
      .querySelectorAll("[data-send-sticker]")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          await sendEmojiSticker(
            button.dataset.sendSticker,
          );
        });
      });

    return;
  }

  contentPickerBody.className =
    "content-picker-body gif-picker-grid";

  if (!state.gifResults.length) {
    contentPickerBody.innerHTML =
      '<div class="picker-empty">Введите запрос или откройте популярные GIF</div>';
    searchGifs(contentPickerSearch.value.trim());
    return;
  }

  renderGifResults();
}

function insertTextAtCursor(input, value) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;

  input.setRangeText(
    value,
    start,
    end,
    "end",
  );

  input.dispatchEvent(
    new Event("input", { bubbles: true }),
  );
  input.focus();
}

async function searchGifs(query = "") {
  contentPickerStatus.textContent =
    "Загружаем GIF…";

  try {
    const payload = await request(
      `/gifs/search?q=${encodeURIComponent(query)}&type=gif`,
    );

    state.gifResults = Array.isArray(payload.results)
      ? payload.results
      : [];
    renderGifResults();
    contentPickerStatus.textContent =
      state.gifResults.length
        ? "GIF предоставлены GIPHY"
        : "Ничего не найдено";
  } catch (error) {
    state.gifResults = [];
    contentPickerBody.innerHTML =
      `<div class="picker-empty">${escapeHtml(error.message)}</div>`;
    contentPickerStatus.textContent = "";
  }
}

function renderGifResults() {
  contentPickerBody.className =
    "content-picker-body gif-picker-grid";

  contentPickerBody.innerHTML = state.gifResults
    .map(
      (gif, index) => `
        <button
          type="button"
          class="gif-result"
          data-gif-index="${index}"
          title="${escapeHtml(gif.title || "GIF")}"
        >
          <img
            src="${escapeHtml(gif.previewUrl)}"
            alt="${escapeHtml(gif.title || "GIF")}"
            loading="lazy"
          >
        </button>
      `,
    )
    .join("");

  contentPickerBody
    .querySelectorAll("[data-gif-index]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const gif =
          state.gifResults[
            Number(button.dataset.gifIndex)
          ];

        if (gif) {
          await sendProviderMedia(gif, "gif");
        }
      });
    });
}

async function sendProviderMedia(result, kind) {
  if (!state.activeChat) return;

  contentPickerStatus.textContent =
    "Сохраняем GIF…";

  try {
    const uploaded = await request(
      "/gifs/import",
      {
        method: "POST",
        body: JSON.stringify({
          url: result.url,
          fileName:
            result.title
              ? `${result.title}.gif`
              : `gif-${Date.now()}.gif`,
          type:
            kind === "sticker"
              ? "sticker"
              : "gif",
        }),
      },
    );

    await createMediaMessage(
      uploaded,
      kind,
      "",
      state.replyToMessage?.id,
    );

    clearReplyMessage();
    toggleContentPicker(false);
  } catch (error) {
    contentPickerStatus.textContent =
      error.message;
  }
}

async function sendEmojiSticker(emoji) {
  if (!state.activeChat) return;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, 512, 512);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font =
    '360px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  context.fillText(emoji, 256, 270);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );

  if (!blob) {
    throw new Error("Не удалось создать стикер");
  }

  await uploadBlob(
    blob,
    `sticker-${Date.now()}.png`,
    "sticker",
    undefined,
    null,
    "",
    state.replyToMessage?.id,
  );

  clearReplyMessage();
  toggleContentPicker(false);
}

/* IMAGE EDITOR */

function editorContext() {
  return imageEditorCanvas.getContext("2d", {
    willReadFrequently: true,
  });
}

function canvasPoint(event) {
  const rect = imageEditorCanvas.getBoundingClientRect();
  return {
    x:
      (event.clientX - rect.left) *
      (imageEditorCanvas.width / rect.width),
    y:
      (event.clientY - rect.top) *
      (imageEditorCanvas.height / rect.height),
  };
}

function pushEditorHistory() {
  try {
    state.editorHistory.push(
      imageEditorCanvas.toDataURL("image/png"),
    );

    if (state.editorHistory.length > 10) {
      state.editorHistory.shift();
    }
  } catch {
    // Browser may reject a snapshot for extremely large images.
  }
}

async function restoreEditorSnapshot(dataUrl) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const context = editorContext();
  context.clearRect(
    0,
    0,
    imageEditorCanvas.width,
    imageEditorCanvas.height,
  );
  context.drawImage(
    image,
    0,
    0,
    imageEditorCanvas.width,
    imageEditorCanvas.height,
  );
}

async function openImageEditor() {
  const index = state.pendingMediaIndex;
  const file = state.pendingMediaFiles[index];

  if (!file || !file.type.startsWith("image/")) {
    return;
  }

  state.editorFileIndex = index;
  state.editorTool = "draw";
  state.editorHistory = [];
  state.editorStickerValue = null;

  const image = new Image();
  image.src = state.pendingMediaUrls[index];
  await image.decode();

  state.editorSourceImage = image;

  const maxDimension = 4096;
  const scale = Math.min(
    1,
    maxDimension / Math.max(
      image.naturalWidth,
      image.naturalHeight,
    ),
  );

  imageEditorCanvas.width = Math.max(
    1,
    Math.round(image.naturalWidth * scale),
  );
  imageEditorCanvas.height = Math.max(
    1,
    Math.round(image.naturalHeight * scale),
  );

  const context = editorContext();
  context.clearRect(
    0,
    0,
    imageEditorCanvas.width,
    imageEditorCanvas.height,
  );
  context.drawImage(
    image,
    0,
    0,
    imageEditorCanvas.width,
    imageEditorCanvas.height,
  );

  imageEditorModal.classList.remove("hidden");
  mediaPreviewModal.classList.add("hidden");
  setEditorTool("draw");
  renderEditorStickerTray();
}

function closeImageEditor(saveNothing = true) {
  imageEditorModal.classList.add("hidden");
  mediaPreviewModal.classList.remove("hidden");

  state.editorDrawing = false;
  state.editorLastPoint = null;
  state.editorStickerValue = null;

  if (saveNothing) {
    state.editorHistory = [];
  }
}

function setEditorTool(tool) {
  state.editorTool = tool;
  state.editorStickerValue = null;

  imageEditorModal
    .querySelectorAll("[data-editor-tool]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.editorTool === tool,
      );
    });

  imageEditorStickerTray.classList.add("hidden");
  imageEditorCanvas.style.cursor =
    tool === "text" || tool === "sticker"
      ? "crosshair"
      : "crosshair";
}

function renderEditorStickerTray() {
  imageEditorStickerTray.innerHTML =
    BUILT_IN_STICKERS
      .map(
        (emoji) => `
          <button
            type="button"
            data-editor-sticker="${emoji}"
          >${emoji}</button>
        `,
      )
      .join("");

  imageEditorStickerTray
    .querySelectorAll("[data-editor-sticker]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        state.editorTool = "sticker";
        state.editorStickerValue =
          button.dataset.editorSticker;
        imageEditorStickerTray.classList.add("hidden");
      });
    });
}

function applyMosaic(point) {
  const context = editorContext();
  const brush = Math.max(
    20,
    Number(imageEditorSize.value) *
      (
        imageEditorCanvas.width /
        Math.max(500, imageEditorCanvas.clientWidth)
      ),
  );
  const x = Math.max(0, point.x - brush / 2);
  const y = Math.max(0, point.y - brush / 2);
  const width = Math.min(
    brush,
    imageEditorCanvas.width - x,
  );
  const height = Math.min(
    brush,
    imageEditorCanvas.height - y,
  );

  if (width <= 0 || height <= 0) return;

  const offscreen = document.createElement("canvas");
  const small = Math.max(4, Math.round(brush / 10));
  offscreen.width = small;
  offscreen.height = small;
  const offContext = offscreen.getContext("2d");

  offContext.imageSmoothingEnabled = true;
  offContext.drawImage(
    imageEditorCanvas,
    x,
    y,
    width,
    height,
    0,
    0,
    small,
    small,
  );

  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(
    offscreen,
    0,
    0,
    small,
    small,
    x,
    y,
    width,
    height,
  );
  context.restore();
}

function drawEditorStroke(from, to) {
  const context = editorContext();
  const ratio =
    imageEditorCanvas.width /
    Math.max(500, imageEditorCanvas.clientWidth);

  context.save();
  context.strokeStyle = imageEditorColor.value;
  context.lineWidth =
    Number(imageEditorSize.value) * ratio;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
  context.restore();
}

function placeEditorText(point) {
  const text = prompt("Введите текст");

  if (!text?.trim()) return;

  pushEditorHistory();

  const context = editorContext();
  const ratio =
    imageEditorCanvas.width /
    Math.max(500, imageEditorCanvas.clientWidth);
  const size = Math.max(
    30,
    Number(imageEditorSize.value) * 2.8 * ratio,
  );

  context.save();
  context.font = `700 ${size}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = Math.max(3, size * 0.08);
  context.strokeStyle = "rgba(0,0,0,.72)";
  context.fillStyle = imageEditorColor.value;
  context.strokeText(text.trim(), point.x, point.y);
  context.fillText(text.trim(), point.x, point.y);
  context.restore();
}

function placeEditorSticker(point) {
  const emoji =
    state.editorStickerValue || "😊";

  pushEditorHistory();

  const context = editorContext();
  const ratio =
    imageEditorCanvas.width /
    Math.max(500, imageEditorCanvas.clientWidth);
  const size = Math.max(
    90,
    Number(imageEditorSize.value) * 5 * ratio,
  );

  context.save();
  context.font =
    `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(emoji, point.x, point.y);
  context.restore();

  state.editorStickerValue = null;
  setEditorTool("draw");
}

async function undoImageEditor() {
  const snapshot = state.editorHistory.pop();

  if (snapshot) {
    await restoreEditorSnapshot(snapshot);
  }
}

function resetImageEditor() {
  if (!state.editorSourceImage) return;

  pushEditorHistory();

  const context = editorContext();
  context.clearRect(
    0,
    0,
    imageEditorCanvas.width,
    imageEditorCanvas.height,
  );
  context.drawImage(
    state.editorSourceImage,
    0,
    0,
    imageEditorCanvas.width,
    imageEditorCanvas.height,
  );
}

async function saveImageEditor() {
  const index = state.editorFileIndex;
  const original = state.pendingMediaFiles[index];

  if (!original) return;

  imageEditorSave.disabled = true;
  imageEditorSave.textContent = "Сохраняем…";

  try {
    const blob = await new Promise((resolve) =>
      imageEditorCanvas.toBlob(
        resolve,
        "image/png",
        1,
      ),
    );

    if (!blob) {
      throw new Error(
        "Не удалось сохранить изображение",
      );
    }

    const baseName =
      original.name.replace(/\.[^.]+$/, "") ||
      "image";
    const nextFile = new File(
      [blob],
      `${baseName}-edited.png`,
      {
        type: "image/png",
        lastModified: Date.now(),
      },
    );

    URL.revokeObjectURL(
      state.pendingMediaUrls[index],
    );
    state.pendingMediaFiles[index] = nextFile;
    state.pendingMediaUrls[index] =
      URL.createObjectURL(nextFile);

    closeImageEditor(false);
    renderMediaPreview();
  } finally {
    imageEditorSave.disabled = false;
    imageEditorSave.textContent = "Готово";
  }
}

/* ATTACHMENTS / MESSAGE ACTIONS */

function isDeletedForEveryone(message) {
  const metadata =
    message?.metadata &&
    typeof message.metadata === "object"
      ? message.metadata
      : {};

  return Boolean(
    metadata.deletedForEveryone,
  );
}

function deletedMessageMarkup() {
  return `
    <div class="message-deleted-text">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/>
        <path d="m8.5 8.5 7 7"/>
      </svg>
      <span>Сообщение удалено</span>
    </div>
  `;
}


function messageSummary(message) {
  if (!message) return "Сообщение";
  if (isDeletedForEveryone(message)) {
    return "Сообщение удалено";
  }
  if (message.text?.trim()) return message.text.trim();
  if (message.kind === "image") return "Фотография";
  if (message.kind === "video") return "Видео";
  if (message.kind === "voice") return "Голосовое сообщение";
  if (message.kind === "file") return message.file_name || "Документ";
  return "Сообщение";
}

function messageKindLabel(message) {
  const labels = {
    text: "Текстовое сообщение",
    image: "Фотография",
    video: "Видео",
    voice: "Голосовое сообщение",
    file: "Документ",
    sticker: "Стикер",
  };

  return labels[message?.kind] || "Сообщение";
}

function findMessageById(messageId) {
  return state.activeMessages.find((message) => message.id === messageId) || null;
}

function replyMarkup(message) {
  if (!message.reply_to_id) return "";

  const original = findMessageById(message.reply_to_id);
  const senderName =
    original?.sender_id === state.user?.id
      ? "Вы"
      : state.activeChat?.peer?.displayName ||
        state.activeChat?.title ||
        "Сообщение";

  return `
    <button
      type="button"
      class="message-reply-quote"
      data-reply-message-id="${escapeHtml(message.reply_to_id)}"
    >
      <strong>${escapeHtml(senderName)}</strong>
      <span>${escapeHtml(messageSummary(original))}</span>
    </button>
  `;
}

function setReplyMessage(message) {
  state.replyToMessage = message;
  replyComposerTitle.textContent =
    message.sender_id === state.user?.id
      ? "Ответ себе"
      : `Ответ: ${
          state.activeChat?.peer?.displayName ||
          state.activeChat?.title ||
          "сообщение"
        }`;
  replyComposerText.textContent = messageSummary(message);
  replyComposerBar.classList.remove("hidden");
  messageInput.focus();
}

function clearReplyMessage() {
  state.replyToMessage = null;
  replyComposerBar.classList.add("hidden");
  replyComposerText.textContent = "";
}

function scrollToMessage(messageId) {
  const target = messageArea.querySelector(
    `[data-message-id="${CSS.escape(messageId)}"]`,
  );

  if (!target) return;

  target.scrollIntoView({
    block: "center",
    behavior: "smooth",
  });

  target.classList.add("message-highlight");
  setTimeout(() => target.classList.remove("message-highlight"), 1200);
}

function toggleAttachmentMenu(force) {
  const shouldOpen =
    typeof force === "boolean"
      ? force
      : attachmentMenu.classList.contains("hidden");

  attachmentMenu.classList.toggle("hidden", !shouldOpen);
  attachmentButton.classList.toggle("active", shouldOpen);
}

function insertIntoMediaCaption(value) {
  const start =
    mediaPreviewCaption.selectionStart ??
    mediaPreviewCaption.value.length;
  const end =
    mediaPreviewCaption.selectionEnd ??
    start;

  mediaPreviewCaption.setRangeText(
    value,
    start,
    end,
    "end",
  );

  mediaPreviewCaption.focus();
  mediaPreviewCaption.dispatchEvent(
    new Event("input", {
      bubbles: true,
    }),
  );
}

function renderMediaPreviewEmojiPicker() {
  mediaPreviewEmojiGrid.innerHTML =
    BUILT_IN_EMOJIS
      .map(
        (emoji) => `
          <button
            type="button"
            data-preview-emoji="${escapeHtml(
              emoji,
            )}"
          >${escapeHtml(emoji)}</button>
        `,
      )
      .join("");

  mediaPreviewEmojiGrid
    .querySelectorAll(
      "[data-preview-emoji]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();
          insertIntoMediaCaption(
            button.dataset.previewEmoji,
          );
        },
      );
    });
}

function toggleMediaPreviewEmojiPicker(
  force,
) {
  const shouldOpen =
    typeof force === "boolean"
      ? force
      : mediaPreviewEmojiPicker
          .classList
          .contains("hidden");

  mediaPreviewEmojiPicker.classList.toggle(
    "hidden",
    !shouldOpen,
  );

  mediaPreviewEmojiButton.classList.toggle(
    "active",
    shouldOpen,
  );

  mediaPreviewEmojiButton.setAttribute(
    "aria-expanded",
    shouldOpen
      ? "true"
      : "false",
  );

  if (shouldOpen) {
    renderMediaPreviewEmojiPicker();
  }
}


function clearPendingMedia() {
  for (const url of state.pendingMediaUrls) {
    URL.revokeObjectURL(url);
  }

  state.pendingMediaFiles = [];
  state.pendingMediaUrls = [];
  state.pendingMediaIndex = 0;

  mediaPreviewImage.removeAttribute("src");
  mediaPreviewVideo.pause();
  mediaPreviewVideo.removeAttribute("src");
  mediaPreviewVideo.load();
  mediaPreviewCaption.value = "";
  toggleMediaPreviewEmojiPicker(false);
  mediaPreviewThumbnails.innerHTML = "";
  mediaInput.value = "";
  cameraInput.value = "";
  videoCaptureInput.value = "";
}

function openMediaPreview(files) {
  closeUserProfilePanel(true);
  closeSharedChatPanel();

  const accepted = [...files].filter(
    (file) =>
      file.type.startsWith("image/") ||
      file.type.startsWith("video/"),
  );

  if (!accepted.length) return;

  const availableSlots = Math.max(
    0,
    10 - state.pendingMediaFiles.length,
  );
  const nextFiles = accepted.slice(0, availableSlots);

  state.pendingMediaFiles.push(...nextFiles);
  state.pendingMediaUrls.push(
    ...nextFiles.map((file) => URL.createObjectURL(file)),
  );

  if (state.pendingMediaFiles.length === nextFiles.length) {
    state.pendingMediaIndex = 0;
  }

  renderMediaPreview();
  mediaPreviewModal.classList.remove("hidden");
  document.body.classList.add("viewer-open");
  toggleAttachmentMenu(false);
}

function renderMediaPreview() {
  const file = state.pendingMediaFiles[state.pendingMediaIndex];
  const url = state.pendingMediaUrls[state.pendingMediaIndex];

  if (!file || !url) {
    closeMediaPreview();
    return;
  }

  const isVideo = file.type.startsWith("video/");

  mediaPreviewImage.classList.toggle("hidden", isVideo);
  mediaPreviewVideo.classList.toggle("hidden", !isVideo);

  if (isVideo) {
    mediaPreviewImage.removeAttribute("src");
    mediaPreviewVideo.src = url;
    mediaPreviewVideo.load();
  } else {
    mediaPreviewVideo.pause();
    mediaPreviewVideo.removeAttribute("src");
    mediaPreviewVideo.load();
    mediaPreviewImage.src = url;
    mediaPreviewImage.alt = file.name;
  }

  mediaPreviewCounter.textContent =
    `${state.pendingMediaIndex + 1} из ${state.pendingMediaFiles.length}`;

  mediaPreviewPrev.disabled = state.pendingMediaFiles.length < 2;
  mediaPreviewNext.disabled = state.pendingMediaFiles.length < 2;
  mediaPreviewEdit.classList.toggle("hidden", isVideo);

  mediaPreviewThumbnails.innerHTML = state.pendingMediaFiles
    .map((item, index) => {
      const itemUrl = state.pendingMediaUrls[index];
      const video = item.type.startsWith("video/");

      return `
        <button
          type="button"
          class="media-preview-thumbnail ${
            index === state.pendingMediaIndex ? "active" : ""
          }"
          data-preview-index="${index}"
          title="${escapeHtml(item.name)}"
        >
          ${
            video
              ? `<video src="${itemUrl}" muted preload="metadata"></video>`
              : `<img src="${itemUrl}" alt="">`
          }
          <span class="media-preview-remove" data-remove-index="${index}">×</span>
        </button>
      `;
    })
    .join("");

  mediaPreviewThumbnails
    .querySelectorAll("[data-preview-index]")
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        if (event.target.closest("[data-remove-index]")) return;
        state.pendingMediaIndex = Number(button.dataset.previewIndex);
        renderMediaPreview();
      });
    });

  mediaPreviewThumbnails
    .querySelectorAll("[data-remove-index]")
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        removePendingMedia(Number(button.dataset.removeIndex));
      });
    });
}

function removePendingMedia(index) {
  const url = state.pendingMediaUrls[index];
  if (url) URL.revokeObjectURL(url);

  state.pendingMediaFiles.splice(index, 1);
  state.pendingMediaUrls.splice(index, 1);

  if (!state.pendingMediaFiles.length) {
    closeMediaPreview();
    return;
  }

  state.pendingMediaIndex = Math.min(
    state.pendingMediaIndex,
    state.pendingMediaFiles.length - 1,
  );
  renderMediaPreview();
}

function moveMediaPreview(direction) {
  if (state.pendingMediaFiles.length < 2) return;

  state.pendingMediaIndex =
    (
      state.pendingMediaIndex +
      direction +
      state.pendingMediaFiles.length
    ) % state.pendingMediaFiles.length;

  renderMediaPreview();
}

function closeMediaPreview() {
  mediaPreviewModal.classList.add("hidden");
  document.body.classList.remove("viewer-open");
  clearPendingMedia();
}

async function sendPendingMedia() {
  if (!state.activeChat || !state.pendingMediaFiles.length) return;

  const files = [...state.pendingMediaFiles];
  const caption = mediaPreviewCaption.value.trim();
  const replyToId = state.replyToMessage?.id;

  mediaPreviewSend.disabled = true;

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];

      await uploadBlob(
        file,
        file.name,
        classifyFile(file),
        undefined,
        null,
        index === 0 ? caption : "",
        index === 0 ? replyToId : undefined,
      );
    }

    clearReplyMessage();
    closeMediaPreview();
  } catch (error) {
    setUploadStatus(error.message, true);
    setTimeout(() => setUploadStatus(""), 4000);
  } finally {
    mediaPreviewSend.disabled = false;
  }
}

function openMessageContextMenu(message, trigger) {
  state.contextMessage = message;

  const deletedForEveryone =
    isDeletedForEveryone(message);

  quickReactionRow.classList.toggle(
    "hidden",
    deletedForEveryone,
  );

  messageDownloadAction.classList.toggle(
    "hidden",
    !message.media_key ||
      deletedForEveryone,
  );

  messageDeleteEveryoneAction.classList.toggle(
    "hidden",
    message.sender_id !== state.user?.id ||
      deletedForEveryone,
  );

  messageDeleteMeAction.classList.remove(
    "hidden",
  );

  messageContextMenu.classList.remove("hidden");

  const rect = trigger.getBoundingClientRect();
  const menuRect = messageContextMenu.getBoundingClientRect();

  let left = rect.right - menuRect.width;
  let top = rect.bottom + 5;

  if (left < 8) left = 8;
  if (left + menuRect.width > window.innerWidth - 8) {
    left = window.innerWidth - menuRect.width - 8;
  }
  if (top + menuRect.height > window.innerHeight - 8) {
    top = rect.top - menuRect.height - 5;
  }

  messageContextMenu.style.left = `${left}px`;
  messageContextMenu.style.top = `${Math.max(8, top)}px`;
}

function closeMessageContextMenu() {
  messageContextMenu.classList.add("hidden");
  quickReactionRow.classList.remove(
    "hidden",
  );
  state.contextMessage = null;
}

async function copyMessageContent(message) {
  const content =
    message.text?.trim() ||
    (message.media_key
      ? `${location.origin}/api/media/${encodeURIComponent(message.media_key)}`
      : messageSummary(message));

  await navigator.clipboard.writeText(content);
  setUploadStatus("Скопировано");
  setTimeout(() => setUploadStatus(""), 1300);
}

function downloadMessageMedia(message) {
  if (!message.media_key) return;

  const anchor = document.createElement("a");
  anchor.href = `/api/media/${encodeURIComponent(message.media_key)}`;
  anchor.download = message.file_name || `${message.kind}-${message.id}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function receiptStatusLabel(status) {
  if (status === "read") return "Прочитано";
  if (status === "delivered") return "Доставлено";
  return "Отправлено на сервер";
}

function openMessageInfo(message) {
  messageInfoKind.textContent = messageKindLabel(message);
  messageInfoPreview.textContent = messageSummary(message);
  messageInfoSentAt.textContent = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(message.created_at));

  messageInfoStatus.textContent =
    message.sender_id === state.user?.id
      ? receiptStatusLabel(message.receipt_status)
      : "Получено";

  messageInfoModal.classList.remove("hidden");
}

const BUILT_IN_EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","🙂",
  "🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋",
  "😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳",
  "😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖",
  "😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯",
  "😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔",
  "🫣","🤭","🫢","🫡","🤫","🫠","🤥","😶","😐","😑",
  "😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤",
  "😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕",
  "😈","👿","👻","💀","☠️","👽","🤖","💩","😺","😸",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
  "❤️‍🔥","💕","💞","💓","💗","💖","💘","💝","💟","❣️",
  "👍","👎","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘",
  "🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖",
  "👋","🤝","👏","🙌","🫶","🙏","💪","🦾","🖕","✍️",
  "👀","👁️","🧠","🫀","🫂","👑","💋","🌹","🌸","🌞",
  "🔥","✨","⭐","🌟","💫","⚡","💥","💯","✅","❌",
  "❗","❓","‼️","⁉️","🎉","🎊","🎈","🎁","🏆","🥇",
  "🚀","✈️","🚗","🏠","💰","💎","🔔","🔕","📌","📱",
  "🍏","🍉","🍓","🍒","🍕","🍔","🌭","🍿","🍺","☕",
  "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐸","🐵",
];

const BUILT_IN_STICKERS = [
  "😀","😂","🤣","😍","🥰","😎","🤩","🥳",
  "😭","😡","🤔","😮","👍","👏","🙏","💪",
  "❤️","🔥","🎉","💯","🚀","👀","🤝","👌",
];

function normalizeReaction(item) {
  return {
    emoji: String(item?.emoji || ""),
    count: Number(item?.count ?? item?.reaction_count ?? 0),
    reactedByMe: Boolean(
      item?.reactedByMe ?? item?.reacted_by_me,
    ),
  };
}

function reactionMarkup(message) {
  const reactions = Array.isArray(message.reactions)
    ? message.reactions.map(normalizeReaction).filter(
        (item) => item.emoji && item.count > 0,
      )
    : [];

  if (!reactions.length) {
    return '<div class="message-reactions hidden" data-message-reactions></div>';
  }

  return `
    <div class="message-reactions" data-message-reactions>
      ${reactions
        .map(
          (reaction) => `
            <button
              type="button"
              class="message-reaction-chip ${
                reaction.reactedByMe ? "mine" : ""
              }"
              data-reaction-emoji="${escapeHtml(reaction.emoji)}"
            >
              <span>${escapeHtml(reaction.emoji)}</span>
              <b>${reaction.count}</b>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderMessageReactions(messageId, reactions) {
  const message = state.activeMessages.find(
    (item) => item.id === messageId,
  );

  if (message) {
    message.reactions = Array.isArray(reactions)
      ? reactions.map(normalizeReaction)
      : [];
  }

  const row = messageArea.querySelector(
    `[data-message-id="${CSS.escape(messageId)}"]`,
  );
  const container = row?.querySelector(
    "[data-message-reactions]",
  );

  if (!container) return;

  const normalized = Array.isArray(reactions)
    ? reactions.map(normalizeReaction).filter(
        (item) => item.emoji && item.count > 0,
      )
    : [];

  container.classList.toggle(
    "hidden",
    !normalized.length,
  );

  container.innerHTML = normalized
    .map(
      (reaction) => `
        <button
          type="button"
          class="message-reaction-chip ${
            reaction.reactedByMe ? "mine" : ""
          }"
          data-reaction-emoji="${escapeHtml(reaction.emoji)}"
        >
          <span>${escapeHtml(reaction.emoji)}</span>
          <b>${reaction.count}</b>
        </button>
      `,
    )
    .join("");

  bindReactionChips(row, messageId);
}

function bindReactionChips(row, messageId) {
  row
    ?.querySelectorAll("[data-reaction-emoji]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const message = findMessageById(messageId);
        if (!message) return;

        await toggleMessageReaction(
          message,
          button.dataset.reactionEmoji,
        );
      });
    });
}

async function toggleMessageReaction(message, emoji) {
  if (!state.activeChat) return;

  if (!currentChatPermissions().reactions) {
    alert("Владелец запретил реакции и эмодзи");
    return;
  }

  const existing = Array.isArray(message.reactions)
    ? message.reactions
        .map(normalizeReaction)
        .find((item) => item.emoji === emoji)
    : null;

  const result = await request(
    `/chats/${state.activeChat.id}/messages/${message.id}/reaction`,
    {
      method: existing?.reactedByMe
        ? "DELETE"
        : "POST",
      body: existing?.reactedByMe
        ? undefined
        : JSON.stringify({ emoji }),
    },
  );

  renderMessageReactions(message.id, result);
}

function openChatDeleteConfirmation(
  chat,
) {
  state.chatDeleteTarget = chat;
  chatDeleteTargetLabel.textContent =
    chatTitleValue(chat);
  chatDeleteConfirmInput.value = "";
  chatDeleteStatus.textContent = "";
  chatDeleteModal.classList.remove(
    "hidden",
  );

  requestAnimationFrame(() => {
    chatDeleteConfirmInput.focus();
  });
}

function closeChatDeleteConfirmation() {
  chatDeleteModal.classList.add(
    "hidden",
  );
  chatDeleteConfirmInput.value = "";
  chatDeleteStatus.textContent = "";
  state.chatDeleteTarget = null;
}

function resetChatPaneAfterDelete(
  chatId,
) {
  if (
    state.activeChat?.id !==
    chatId
  ) {
    return;
  }

  closeUserProfilePanel();
  closeSharedChatPanel();
  closeDialogSearch(false);
  state.activeChat = null;
  state.activeMessages = [];
  state.replyToMessage = null;
  messageArea.innerHTML = "";
  messageArea.classList.add("hidden");
  recordBar.classList.add("hidden");
  emptyState.classList.remove("hidden");
  messengerScreen.classList.remove(
    "chat-open",
  );
  chatTitle.textContent =
    "Meetus Messenger";
  chatStatus.textContent =
    "Выберите чат слева";
}

async function confirmChatDelete() {
  const chat =
    state.chatDeleteTarget;
  const confirmation =
    chatDeleteConfirmInput.value
      .trim()
      .toLocaleLowerCase("ru-RU");

  if (!chat?.id) return;

  if (confirmation !== "да") {
    chatDeleteStatus.textContent =
      "Для удаления напишите «Да»";
    chatDeleteConfirmInput.focus();
    return;
  }

  chatDeleteConfirm.disabled = true;
  chatDeleteStatus.textContent =
    "Удаляем чат…";

  try {
    await request(
      `/chats/${chat.id}`,
      {
        method: "DELETE",
      },
    );

    resetChatPaneAfterDelete(
      chat.id,
    );

    state.chats =
      state.chats.filter(
        (item) =>
          item.id !== chat.id,
      );

    closeChatDeleteConfirmation();
    renderChats();
    await loadChats(false);
  } catch (error) {
    chatDeleteStatus.textContent =
      error.message;
  } finally {
    chatDeleteConfirm.disabled =
      false;
  }
}


function reactionSearchName(emoji) {
  const names = {
    "❤️": "сердце любовь",
    "😂": "смех смешно",
    "😭": "плач грусть",
    "👍": "палец вверх да",
    "👎": "палец вниз нет",
    "🔥": "огонь",
    "🙏": "молитва спасибо",
    "👏": "аплодисменты",
    "🎉": "праздник",
    "🤔": "думаю",
    "😡": "злость",
    "😍": "любовь глаза",
    "💯": "сто",
    "🚀": "ракета",
  };

  return names[emoji] || "";
}

function renderReactionPicker(query = "") {
  const clean =
    query
      .trim()
      .toLocaleLowerCase("ru-RU");

  const emojis =
    BUILT_IN_EMOJIS.filter(
      (emoji) =>
        !clean ||
        reactionSearchName(emoji)
          .includes(clean) ||
        emoji.includes(clean),
    );

  reactionPickerGrid.innerHTML =
    emojis
      .map(
        (emoji) => `
          <button
            type="button"
            data-picker-reaction="${escapeHtml(
              emoji,
            )}"
          >${escapeHtml(emoji)}</button>
        `,
      )
      .join("");

  reactionPickerGrid
    .querySelectorAll(
      "[data-picker-reaction]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const message =
            state.reactionTargetMessage;

          if (!message) return;

          try {
            await toggleMessageReaction(
              message,
              button.dataset
                .pickerReaction,
            );
            closeReactionPicker();
          } catch (error) {
            alert(error.message);
          }
        },
      );
    });
}

function openReactionPicker(message) {
  if (!message) return;

  state.reactionTargetMessage =
    message;
  reactionPickerSearch.value = "";
  renderReactionPicker();
  closeMessageContextMenu();
  reactionPicker.classList.remove(
    "hidden",
  );

  requestAnimationFrame(() => {
    reactionPickerSearch.focus();
  });
}

function closeReactionPicker() {
  reactionPicker.classList.add(
    "hidden",
  );
  reactionPickerSearch.value = "";
  state.reactionTargetMessage = null;
}

function replaceMessageInCurrentView(
  messageId,
  patch,
) {
  const index =
    state.activeMessages.findIndex(
      (message) =>
        message.id === messageId,
    );

  if (index < 0) return;

  const updated = {
    ...state.activeMessages[index],
    ...patch,
    metadata: {
      ...(
        state.activeMessages[index]
          .metadata || {}
      ),
      ...(
        patch.metadata || {}
      ),
    },
  };

  state.activeMessages[index] = updated;

  const currentRow =
    messageArea.querySelector(
      `[data-message-id="${CSS.escape(
        messageId,
      )}"]`,
    );

  const nextRow =
    currentRow?.nextElementSibling ||
    null;

  currentRow?.remove();
  appendMessage(updated);

  const renderedRow =
    messageArea.querySelector(
      `[data-message-id="${CSS.escape(
        messageId,
      )}"]`,
    );

  if (
    renderedRow &&
    nextRow &&
    nextRow.isConnected
  ) {
    messageArea.insertBefore(
      renderedRow,
      nextRow,
    );
  }
}

function markMessageDeletedForEveryone(
  messageId,
) {
  replaceMessageInCurrentView(
    messageId,
    {
      kind: "text",
      text: "Сообщение удалено",
      media_key: null,
      mime_type: null,
      file_name: null,
      file_size: null,
      duration_ms: null,
      waveform: null,
      width: null,
      height: null,
      reply_to_id: null,
      reactions: [],
      metadata: {
        deletedForEveryone: true,
      },
    },
  );
}


function removeMessageFromCurrentView(
  messageId,
) {
  state.activeMessages =
    state.activeMessages.filter(
      (message) =>
        message.id !== messageId,
    );

  messageArea
    .querySelector(
      `[data-message-id="${CSS.escape(
        messageId,
      )}"]`,
    )
    ?.remove();

  if (!state.activeMessages.length) {
    messageArea.innerHTML =
      '<div class="empty-chat-history">Сообщений пока нет</div>';
  }
}

async function deleteMessageForScope(
  message,
  scope,
) {
  const chatId =
    state.activeChat?.id;

  if (!chatId || !message?.id) return;

  await request(
    `/chats/${chatId}/messages/${message.id}?scope=${encodeURIComponent(
      scope,
    )}`,
    {
      method: "DELETE",
    },
  );

  if (scope === "everyone") {
    markMessageDeletedForEveryone(
      message.id,
    );
  } else {
    removeMessageFromCurrentView(
      message.id,
    );
  }

  await loadChats(false);
}

function openChatClearConfirmation() {
  const chat = state.activeChat;

  if (!chat) return;

  state.chatClearTarget = chat;
  chatClearTargetLabel.textContent =
    chatTitleValue(chat);
  chatClearConfirmInput.value = "";
  chatClearStatus.textContent = "";
  closeChatHeaderMenu();
  chatClearModal.classList.remove(
    "hidden",
  );

  requestAnimationFrame(() => {
    chatClearConfirmInput.focus();
  });
}

function closeChatClearConfirmation() {
  chatClearModal.classList.add(
    "hidden",
  );
  chatClearConfirmInput.value = "";
  chatClearStatus.textContent = "";
  state.chatClearTarget = null;
}

async function confirmChatClear() {
  const chat =
    state.chatClearTarget;
  const confirmation =
    chatClearConfirmInput.value
      .trim()
      .toLocaleLowerCase("ru-RU");

  if (!chat?.id) return;

  if (confirmation !== "да") {
    chatClearStatus.textContent =
      "Для очистки напишите «Да»";
    chatClearConfirmInput.focus();
    return;
  }

  chatClearConfirm.disabled = true;
  chatClearStatus.textContent =
    "Очищаем историю…";

  try {
    await request(
      `/chats/${chat.id}/messages`,
      {
        method: "DELETE",
      },
    );

    if (
      state.activeChat?.id ===
      chat.id
    ) {
      state.activeMessages = [];
      messageArea.innerHTML =
        '<div class="empty-chat-history">История чата очищена</div>';
      closeDialogSearch(false);
    }

    closeChatClearConfirmation();
    await loadChats(false);
  } catch (error) {
    chatClearStatus.textContent =
      error.message;
  } finally {
    chatClearConfirm.disabled =
      false;
  }
}


/* MESSAGES */

const gifObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const video = entry.target;

      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  },
  {
    root: messageArea,
    rootMargin: "140px 0px",
    threshold: 0.08,
  },
);

function gifMarkup(message, url, fileName) {
  const mimeType =
    String(message.mime_type || "")
      .toLowerCase();
  const imageAsset =
    mimeType.startsWith("image/");

  const media = imageAsset
    ? `
      <img
        class="message-gif"
        src="${url}"
        alt="${escapeHtml(fileName)}"
        loading="lazy"
        decoding="async"
      >
    `
    : `
      <video
        class="message-gif-video"
        src="${url}"
        aria-label="${escapeHtml(fileName)}"
        muted
        loop
        playsinline
        autoplay
        preload="auto"
      ></video>
    `;

  return `
    <button
      type="button"
      class="message-gif-button"
      data-media-key="${escapeHtml(message.media_key)}"
      aria-label="Открыть GIF"
    >
      ${media}
      <span class="message-gif-label">GIF</span>
    </button>
  `;
}

function isGifMessage(message) {
  const mimeType =
    String(message?.mime_type || "").toLowerCase();
  const fileName =
    String(message?.file_name || "").toLowerCase();

  return (
    message?.kind === "gif" ||
    mimeType === "image/gif" ||
    mimeType === "image/webp" ||
    fileName.endsWith(".gif")
  );
}


function imageMarkup(message, url, fileName) {
  const gif = isGifMessage(message);

  return `
    <button
      type="button"
      class="media-image-button ${gif ? "gif-message-button" : ""}"
      data-media-key="${escapeHtml(message.media_key)}"
      aria-label="${gif ? "Открыть GIF" : "Открыть изображение"}"
    >
      <img
        class="message-image ${gif ? "message-gif" : ""}"
        src="${url}"
        alt="${fileName}"
        loading="lazy"
      >
      ${
        gif
          ? '<span class="message-gif-label">GIF</span>'
          : ""
      }
    </button>
  `;
}

function videoMarkup(message, url) {
  return `
    <button
      type="button"
      class="media-video-button"
      data-media-key="${escapeHtml(message.media_key)}"
      aria-label="Открыть видео"
    >
      <video
        class="message-video-preview"
        preload="metadata"
        muted
        playsinline
      >
        <source
          src="${url}"
          type="${escapeHtml(message.mime_type || "video/mp4")}"
        >
      </video>

      <span class="message-video-play" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="m8 5 11 7-11 7z"/>
        </svg>
      </span>

      <span class="message-video-duration">Видео</span>
    </button>
  `;
}

function fileMarkup(message, url, fileName) {
  return `
    <a class="message-file" href="${url}" download="${fileName}">
      <span class="file-circle">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 2h8l4 4v16H6z"/>
          <path d="M14 2v5h5"/>
        </svg>
      </span>
      <span class="file-details">
        <strong>${fileName}</strong>
        <small>${escapeHtml(formatBytes(message.file_size) || "Файл")}</small>
      </span>
      <svg class="file-download" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v13m0 0 5-5m-5 5-5-5M4 21h16"/>
      </svg>
    </a>
  `;
}

function resampleWaveform(values, targetCount = 42) {
  const source = Array.isArray(values)
    ? values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.max(0, Math.min(31, Math.round(value))))
    : [];

  if (!source.length) return [];

  if (source.length === targetCount) return source;

  const output = [];

  for (let index = 0; index < targetCount; index += 1) {
    const start = Math.floor((index * source.length) / targetCount);
    const end = Math.max(
      start + 1,
      Math.floor(((index + 1) * source.length) / targetCount),
    );

    const block = source.slice(start, Math.min(end, source.length));
    const peak = Math.max(...block);
    const average =
      block.reduce((sum, value) => sum + value, 0) / Math.max(1, block.length);

    output.push(Math.round(peak * 0.58 + average * 0.42));
  }

  return output;
}

function waveformHeight(value) {
  const normalized = Math.max(0, Math.min(31, Number(value) || 0)) / 31;
  return 15 + Math.pow(normalized, 0.82) * 85;
}

function voiceBars(waveform) {
  const values = resampleWaveform(waveform, 42);

  if (!values.length) {
    return Array.from(
      { length: 42 },
      () => '<i class="voice-bar loading" style="height:22%"></i>',
    ).join("");
  }

  return values
    .map(
      (value) =>
        `<i class="voice-bar ready" style="height:${waveformHeight(value)}%"></i>`,
    )
    .join("");
}

/*
 * Old messages created before v0.5.0 do not contain waveform data.
 * We decode those once in the browser as a compatibility fallback.
 * New messages never need this path.
 */
function normalizeLegacyWaveform(values) {
  if (!values.length) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.08)] || 0;
  const ceiling = sorted[Math.floor(sorted.length * 0.95)] || 1;
  const range = Math.max(ceiling - floor, 0.0001);

  return values.map((value) => {
    const normalized = Math.min(1, Math.max(0, (value - floor) / range));
    return 15 + Math.pow(normalized, 0.72) * 85;
  });
}

function extractLegacyWaveform(audioBuffer, barCount = 42) {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const blockSize = Math.max(1, Math.floor(length / barCount));
  const values = [];

  for (let bar = 0; bar < barCount; bar += 1) {
    const start = bar * blockSize;
    const end =
      bar === barCount - 1
        ? length
        : Math.min(length, start + blockSize);

    let peak = 0;
    let sumSquares = 0;
    let samples = 0;

    for (let channel = 0; channel < channels; channel += 1) {
      const data = audioBuffer.getChannelData(channel);
      const stride = Math.max(1, Math.floor((end - start) / 800));

      for (let index = start; index < end; index += stride) {
        const sample = Math.abs(data[index] || 0);
        peak = Math.max(peak, sample);
        sumSquares += sample * sample;
        samples += 1;
      }
    }

    const rms = samples > 0 ? Math.sqrt(sumSquares / samples) : 0;
    values.push(peak * 0.42 + rms * 0.58);
  }

  return normalizeLegacyWaveform(values);
}

async function getAudioContextForLegacyAnalysis() {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("Web Audio API is unavailable");
  }

  if (!voiceAudioEngine.context) {
    voiceAudioEngine.context = new AudioContextClass();
  }

  return voiceAudioEngine.context;
}

async function renderLegacyWaveform(container, audio) {
  const bars = [...container.querySelectorAll(".voice-bar")];
  if (!bars.length || !audio?.src) return;

  try {
    const response = await fetch(audio.src, {
      cache: "force-cache",
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(`Waveform fetch failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const context = await getAudioContextForLegacyAnalysis();
    const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
    const heights = extractLegacyWaveform(decoded, 42);

    bars.forEach((bar, index) => {
      bar.style.height = `${heights[index] ?? 18}%`;
      bar.classList.remove("loading");
      bar.classList.add("ready");
    });
  } catch (error) {
    console.warn("Could not build legacy waveform", error);

    bars.forEach((bar) => {
      bar.style.height = "24%";
      bar.classList.remove("loading");
    });
  }
}
function voiceMarkup(message, url) {
  const duration = formatDuration(message.duration_ms);
  const hasStoredWaveform =
    Array.isArray(message.waveform) && message.waveform.length > 0;

  return `
    <div
      class="voice-message"
      data-voice-id="${message.id}"
      data-stored-waveform="${hasStoredWaveform ? "1" : "0"}"
    >
      <button type="button" class="voice-play" title="Воспроизвести">
        <svg class="voice-play-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m8 5 11 7-11 7z"/>
        </svg>
      </button>

      <div class="voice-track-row">
        <div class="voice-waveform">
          ${voiceBars(message.waveform)}
        </div>
        <button type="button" class="voice-speed">1×</button>
      </div>

      <div class="voice-info">
        <span class="voice-current">0:00</span>
        <span>${duration}</span>
      </div>

      <audio class="voice-audio" preload="metadata" src="${url}"></audio>
    </div>
  `;
}

function stickerMarkup(message, url, fileName) {
  return `
    <button
      type="button"
      class="message-sticker-button"
      data-media-key="${escapeHtml(message.media_key)}"
      title="${fileName}"
    >
      <img
        class="message-sticker"
        src="${url}"
        alt="${fileName}"
        loading="lazy"
      >
    </button>
  `;
}

function mediaMarkup(message) {
  if (!message.media_key) return "";

  const url = `/api/media/${encodeURIComponent(message.media_key)}`;
  const fileName = escapeHtml(message.file_name || "Файл");

  if (message.kind === "image") return imageMarkup(message, url, fileName);
  if (message.kind === "video") return videoMarkup(message, url);
  if (message.kind === "voice") return voiceMarkup(message, url);
  if (message.kind === "sticker") return stickerMarkup(message, url, fileName);
  if (message.kind === "gif") return gifMarkup(message, url, fileName);
  return fileMarkup(message, url, fileName);
}

const receiptStatusRank = {
  sent: 1,
  delivered: 2,
  read: 3,
};

function advancedReceiptStatus(current, next) {
  const currentStatus =
    current && receiptStatusRank[current]
      ? current
      : "sent";
  const nextStatus =
    next && receiptStatusRank[next]
      ? next
      : "sent";

  return receiptStatusRank[nextStatus] >
    receiptStatusRank[currentStatus]
    ? nextStatus
    : currentStatus;
}

function messageReceiptIcon(status) {
  if (status === "sent") {
    return `
      <svg viewBox="0 0 13 12" aria-hidden="true">
        <path d="M1.5 6.2 4.6 9.2 11.4 2.2"/>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 18 12" aria-hidden="true">
      <path d="M1.2 6.3 4.2 9.2 10.8 2.3"/>
      <path d="M7.1 7.7 8.7 9.2 16.3 1.8"/>
    </svg>
  `;
}

function messageReceiptMarkup(status = "sent") {
  const normalized =
    receiptStatusRank[status]
      ? status
      : "sent";
  const title = {
    sent:
      "Сообщение принято сервером. Получатель офлайн",
    delivered:
      "Сообщение доставлено, но ещё не прочитано",
    read:
      "Сообщение прочитано",
  }[normalized];

  return `
    <span
      class="message-check receipt-${normalized}"
      data-message-receipt
      data-receipt-status="${normalized}"
      title="${title}"
      aria-label="${title}"
    >${messageReceiptIcon(normalized)}</span>
  `;
}

function updateMessageReceipt(
  messageId,
  nextStatus,
) {
  if (!nextStatus) return;

  const row = messageArea.querySelector(
    `[data-message-id="${messageId}"]`,
  );
  const receipt = row?.querySelector(
    "[data-message-receipt]",
  );

  if (!receipt) return;

  const current =
    receipt.dataset.receiptStatus ||
    "sent";
  const status = advancedReceiptStatus(
    current,
    nextStatus,
  );

  receipt.dataset.receiptStatus = status;
  receipt.className =
    `message-check receipt-${status}`;
  receipt.innerHTML =
    messageReceiptIcon(status);
  receipt.title = {
    sent:
      "Сообщение принято сервером. Получатель офлайн",
    delivered:
      "Сообщение доставлено, но ещё не прочитано",
    read:
      "Сообщение прочитано",
  }[status];
}

async function markActiveChatRead(
  chatId,
  immediate = false,
) {
  if (!chatId) return;

  setChatUnreadCount(chatId, 0);
  clearTimeout(state.readTimer);

  const perform = async () => {
    try {
      await request(
        `/chats/${chatId}/read`,
        { method: "POST" },
      );
      await loadChats(false);
    } catch (error) {
      console.warn(
        "Unable to mark chat as read",
        error,
      );
    }
  };

  if (immediate) {
    await perform();
  } else {
    state.readTimer = setTimeout(
      perform,
      120,
    );
  }
}

function appendMessage(message) {
  if (messageArea.querySelector(`[data-message-id="${message.id}"]`)) return;

  const mine = message.sender_id === state.user?.id;
  const row = document.createElement("div");
  row.className = `message-row ${mine ? "mine" : ""}`;
  row.dataset.messageId = message.id;

  const deletedForEveryone =
    isDeletedForEveryone(message);

  const text = deletedForEveryone
    ? deletedMessageMarkup()
    : message.text
      ? `<div class="message-text">${linkifyMessageText(message.text)}</div>`
      : "";

  row.innerHTML = `
    <div class="message-bubble ${message.media_key && !deletedForEveryone ? "has-media" : ""} ${
      deletedForEveryone ? "deleted-message-bubble" : ""
    } ${
      message.kind === "image" || message.kind === "video"
        ? "visual-media-bubble"
        : ""
    } ${isGifMessage(message) ? "gif-media-bubble" : ""} ${
      !deletedForEveryone && message.kind === "sticker"
        ? "sticker-only-bubble"
        : ""
    }">
      <button type="button" class="message-menu-trigger" title="Действия">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 10 5 5 5-5"/>
        </svg>
      </button>
      ${deletedForEveryone ? "" : replyMarkup(message)}
      ${deletedForEveryone ? "" : mediaMarkup(message)}
      ${text}
      <span class="message-meta">
        <span class="message-time">
          ${escapeHtml(formatTime(message.created_at))}
        </span>
        ${
          mine
            ? messageReceiptMarkup(
                message.receipt_status ||
                  "sent",
              )
            : ""
        }
      </span>
      ${deletedForEveryone ? "" : reactionMarkup(message)}
    </div>
  `;

  messageArea.appendChild(row);

  const imageButton = row.querySelector(".media-image-button");
  if (imageButton) {
    imageButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const gifAsVideo =
        isGifMessage(message) &&
        !String(message.mime_type || "")
          .toLowerCase()
          .startsWith("image/");

      openMediaViewer(
        message.media_key,
        gifAsVideo,
      );
    });
  }

  const videoButton = row.querySelector(".media-video-button");
  if (videoButton) {
    const preview = videoButton.querySelector(".message-video-preview");
    const durationLabel = videoButton.querySelector(".message-video-duration");

    preview?.addEventListener("loadedmetadata", () => {
      if (durationLabel && Number.isFinite(preview.duration)) {
        durationLabel.textContent = formatDuration(preview.duration * 1000);
      }
    });

    videoButton.addEventListener("click", () => {
      openMediaViewer(message.media_key, true);
    });
  }

  const gifVideo =
    row.querySelector(".message-gif-video");
  const gifImage =
    row.querySelector(".message-gif");
  const gifButton =
    row.querySelector(".message-gif-button");

  const markGifReady = () => {
    gifButton?.classList.add("gif-ready");
  };

  if (gifVideo) {
    gifVideo.addEventListener(
      "canplay",
      markGifReady,
      { once: true },
    );
    gifVideo.addEventListener(
      "loadeddata",
      markGifReady,
      { once: true },
    );
    gifObserver.observe(gifVideo);
  }

  if (gifImage) {
    if (gifImage.complete) {
      markGifReady();
    } else {
      gifImage.addEventListener(
        "load",
        markGifReady,
        { once: true },
      );
    }
  }

  if (gifButton) {
    gifButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      openMediaViewer(
        message.media_key,
        Boolean(gifVideo),
      );
    });
  }

  const stickerButton = row.querySelector(".message-sticker-button");
  if (stickerButton) {
    stickerButton.addEventListener("click", () => {
      openMediaViewer(message.media_key, false);
    });
  }

  bindReactionChips(row, message.id);

  const replyQuote = row.querySelector(".message-reply-quote");
  if (replyQuote) {
    replyQuote.addEventListener("click", () => {
      scrollToMessage(replyQuote.dataset.replyMessageId);
    });
  }

  const menuTrigger = row.querySelector(".message-menu-trigger");
  if (menuTrigger) {
    menuTrigger.addEventListener("click", (event) => {
      event.stopPropagation();
      openMessageContextMenu(message, menuTrigger);
    });
  }

  const voice = row.querySelector(".voice-message");
  if (voice) setupVoicePlayer(voice);
}

function scrollMessages(instant = false) {
  const pinToBottom = () => {
    messageArea.scrollTop =
      messageArea.scrollHeight;
  };

  if (!instant) {
    requestAnimationFrame(pinToBottom);
    return;
  }

  messageArea.classList.add(
    "instant-scroll-position",
  );

  pinToBottom();

  requestAnimationFrame(() => {
    pinToBottom();

    requestAnimationFrame(() => {
      pinToBottom();
    });
  });

  [120, 320, 700].forEach((delay) => {
    setTimeout(pinToBottom, delay);
  });

  setTimeout(() => {
    pinToBottom();
    messageArea.classList.remove(
      "instant-scroll-position",
    );
  }, 760);
}

function addActiveMessage(message) {
  const index = state.activeMessages.findIndex(
    (item) => item.id === message.id,
  );

  if (index >= 0) {
    const current = state.activeMessages[index];
    state.activeMessages[index] = {
      ...current,
      ...message,
      receipt_status:
        advancedReceiptStatus(
          current.receipt_status,
          message.receipt_status,
        ),
    };

    updateMessageReceipt(
      message.id,
      state.activeMessages[index]
        .receipt_status,
    );

    return false;
  }

  state.activeMessages.push(message);
  return true;
}

async function sendTextMessage() {
  const permissions = currentChatPermissions();
  const text = messageInput.value.trim();
  const allowed = permissions.text || (permissions.reactions && isEmojiOnlyText(text));

  if (!allowed) {
    setUploadStatus("Владелец запретил этот тип сообщения", true);
    return;
  }

  if (!text || !state.activeChat) return;

  clearLocalChatActivity();
  messageInput.value = "";
  resizeMessageInput();
  updateComposerAction();

  try {
    const message = await request(
      `/chats/${state.activeChat.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          kind: "text",
          text,
          replyToId: state.replyToMessage?.id,
        }),
      },
    );

    if (addActiveMessage(message)) {
      appendMessage(message);
    }
    clearReplyMessage();
    scrollMessages();
    decrementPrivateAllowance();
    playAppSound("send");
    loadChats(false);
  } catch (error) {
    messageInput.value = text;
    resizeMessageInput();
    updateComposerAction();
    alert(error.message);
  }
}

/* VOICE PLAYER */

async function ensureVoiceBoost(audio) {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    audio.volume = 1;
    return;
  }

  if (!voiceAudioEngine.context) {
    voiceAudioEngine.context = new AudioContextClass();
  }

  if (voiceAudioEngine.context.state === "suspended") {
    await voiceAudioEngine.context.resume();
  }

  if (!voiceAudioEngine.nodes.has(audio)) {
    const source = voiceAudioEngine.context.createMediaElementSource(audio);
    const gain = voiceAudioEngine.context.createGain();

    gain.gain.value = 1.15;
    source.connect(gain);
    gain.connect(voiceAudioEngine.context.destination);

    voiceAudioEngine.nodes.set(audio, { source, gain });
  } else {
    voiceAudioEngine.nodes.get(audio).gain.gain.value = 1.15;
  }

  audio.volume = 1;
}

function pauseOtherVoices(currentAudio) {
  document.querySelectorAll(".voice-audio").forEach((audio) => {
    if (audio !== currentAudio && !audio.paused) {
      audio.pause();
    }
  });
}

function setupVoicePlayer(container) {
  const audio = container.querySelector(".voice-audio");
  const playButton = container.querySelector(".voice-play");

  audio.defaultPlaybackRate = 1;
  audio.playbackRate = 1;
  audio.volume = 1;

  if ("preservesPitch" in audio) {
    audio.preservesPitch = true;
  }
  if ("mozPreservesPitch" in audio) {
    audio.mozPreservesPitch = true;
  }
  if ("webkitPreservesPitch" in audio) {
    audio.webkitPreservesPitch = true;
  }
  const waveform = container.querySelector(".voice-waveform");
  const bars = [...container.querySelectorAll(".voice-bar")];
  const currentLabel = container.querySelector(".voice-current");
  const speedButton = container.querySelector(".voice-speed");

  if (container.dataset.storedWaveform !== "1") {
    renderLegacyWaveform(container, audio);
  }

  const playSvg = `
    <svg class="voice-play-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 5 11 7-11 7z"/>
    </svg>
  `;

  const pauseSvg = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14M16 5v14"/>
    </svg>
  `;

  function updateProgress() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const ratio = duration > 0 ? audio.currentTime / duration : 0;
    const playedCount = Math.round(ratio * bars.length);

    bars.forEach((bar, index) => {
      bar.classList.toggle("played", index < playedCount);
    });

    currentLabel.textContent = formatDuration(audio.currentTime * 1000);
  }

  playButton.addEventListener("click", async () => {
    if (audio.paused) {
      pauseOtherVoices(audio);

      try {
        await ensureVoiceBoost(audio);
        await audio.play();
      } catch (error) {
        console.error(error);
      }
    } else {
      audio.pause();
    }
  });

  audio.addEventListener("play", () => {
    playButton.classList.add("playing");
    playButton.innerHTML = pauseSvg;
  });

  audio.addEventListener("pause", () => {
    playButton.classList.remove("playing");
    playButton.innerHTML = playSvg;
  });

  audio.addEventListener("ended", () => {
    playButton.classList.remove("playing");
    playButton.innerHTML = playSvg;
    audio.currentTime = 0;
    updateProgress();
  });

  audio.addEventListener("timeupdate", updateProgress);

  waveform.addEventListener("click", (event) => {
    const box = waveform.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = ratio * audio.duration;
      updateProgress();
    }
  });

  speedButton.addEventListener("click", () => {
    const speeds = [1, 1.5, 2];
    const current =
      speeds.findIndex((speed) => Math.abs(audio.playbackRate - speed) < 0.05);
    const next = speeds[(Math.max(current, 0) + 1) % speeds.length];

    audio.playbackRate = next;
    audio.defaultPlaybackRate = next;
    speedButton.textContent = `${next}×`;
  });
}

/* FILES */

function classifyFile(file) {
  if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
    return "image";
  }
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

async function createMediaMessage(
  uploaded,
  kind,
  caption = "",
  replyToId = undefined,
  durationMs = undefined,
  waveform = null,
) {
  const message = await request(
    `/chats/${state.activeChat.id}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        kind,
        mediaKey: uploaded.key,
        mimeType: uploaded.mimeType,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        durationMs,
        text: caption || undefined,
        replyToId,
        waveform:
          kind === "voice" &&
          Array.isArray(waveform)
            ? waveform
            : undefined,
      }),
    },
  );

  addActiveMessage(message);
  appendMessage(message);
  scrollMessages();
  setUploadStatus("");
  decrementPrivateAllowance();
  playAppSound("send");
  loadChats(false);

  return message;
}

async function uploadMediaForm(
  form,
  timeoutMs = 75_000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    return await fetch(
      `${API}/media/upload`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
        body: form,
        signal: controller.signal,
      },
    );
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Хранилище не ответило вовремя. Повторите отправку.",
      );
    }

    throw new Error(
      "Не удалось связаться с хранилищем файлов",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function uploadBlobCore(
  blob,
  fileName,
  kind,
  durationMs,
  waveform = null,
  caption = "",
  replyToId = undefined,
  forceAttachment = kind === "file",
) {
  if (!state.activeChat) {
    throw new Error("Сначала выберите чат");
  }

  if (!state.token) {
    handleSessionExpired();
    throw new Error("Сессия истекла. Войдите снова.");
  }

  if (blob.size > 200 * 1024 * 1024) {
    throw new Error(
      "Максимальный размер файла — 200 МБ",
    );
  }

  const form = new FormData();
  form.append("file", blob, fileName);

  if (forceAttachment) {
    form.append("disposition", "attachment");
  }

  setUploadStatus(
    kind === "voice"
      ? "Отправляем голосовое сообщение…"
      : `Загружаем ${fileName}…`,
  );

  let response = await uploadMediaForm(form);

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();

    if (refreshed === "ok") {
      response = await uploadMediaForm(form);
    } else if (refreshed === "unauthorized") {
      handleSessionExpired();
      throw new Error("Сессия истекла. Войдите снова.");
    }
  }

  const uploaded = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      uploaded?.message ||
      `Ошибка загрузки ${response.status}`,
    );
  }

  return createMediaMessage(
    uploaded,
    kind,
    caption,
    replyToId,
    durationMs,
    waveform,
  );
}


async function uploadBlob(...args) {
  setLocalChatActivity("upload");
  try {
    return await uploadBlobCore(...args);
  } finally {
    clearLocalChatActivity();
  }
}

async function sendSelectedFile(
  file,
  forceKind = "file",
) {
  if (!file || !state.activeChat) return;

  try {
    await uploadBlob(
      file,
      file.name,
      forceKind,
      undefined,
      null,
      "",
      state.replyToMessage?.id,
      true,
    );
    clearReplyMessage();
  } catch (error) {
    setUploadStatus(error.message, true);
    setTimeout(
      () => setUploadStatus(""),
      4000,
    );
  }
}

/* COMPOSER */

function resizeMessageInput() {
  messageInput.style.height = "auto";
  messageInput.style.height =
    `${Math.min(messageInput.scrollHeight, 126)}px`;
}

function updateComposerAction() {
  const permissions = state.activePermissions || currentChatPermissions();
  const value = messageInput.value.trim();
  const hasText = value.length > 0;
  const canSendText = hasText && (permissions.text || (permissions.reactions && isEmojiOnlyText(value)));
  const canRecordVoice = permissions.voice && !hasText;
  micIcon.classList.toggle("hidden", !canRecordVoice);
  sendIcon.classList.toggle("hidden", !canSendText);
  actionButton.classList.toggle("hidden", !canSendText && !canRecordVoice);
  actionButton.classList.toggle("has-text", canSendText);
  actionButton.disabled = !canSendText && !canRecordVoice;
  actionButton.title = canSendText
    ? "Отправить сообщение"
    : canRecordVoice
      ? "Записать голосовое"
      : hasText
        ? "Этот тип сообщения запрещён владельцем"
        : "Действие запрещено владельцем";
}

/* RECORDING */

function resetLiveRecordWave() {
  const bars = [...recordWave.querySelectorAll("i")];

  bars.forEach((bar, index) => {
    bar.style.height = `${24 + ((index * 11) % 34)}%`;
  });
}

function updateLiveRecordWave(samples) {
  const bars = [...recordWave.querySelectorAll("i")];
  if (!bars.length) return;

  const recent = samples.slice(-bars.length);
  const padded = [
    ...Array(Math.max(0, bars.length - recent.length)).fill(0),
    ...recent,
  ];

  const ceiling = Math.max(0.035, ...padded);

  bars.forEach((bar, index) => {
    const normalized = Math.min(1, (padded[index] || 0) / ceiling);
    const height = 13 + Math.pow(normalized, 0.72) * 87;
    bar.style.height = `${height}%`;
  });
}

function compressRecordingWaveform(samples, targetCount = 64) {
  const clean = samples
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (!clean.length) return Array(targetCount).fill(0);

  const blocks = [];

  for (let index = 0; index < targetCount; index += 1) {
    const start = Math.floor((index * clean.length) / targetCount);
    const end = Math.max(
      start + 1,
      Math.floor(((index + 1) * clean.length) / targetCount),
    );

    const block = clean.slice(start, Math.min(end, clean.length));

    if (!block.length) {
      blocks.push(0);
      continue;
    }

    const peak = Math.max(...block);
    const average =
      block.reduce((sum, value) => sum + value, 0) / block.length;

    blocks.push(peak * 0.58 + average * 0.42);
  }

  const sorted = [...blocks].sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length * 0.08)] || 0;
  const ceiling =
    sorted[Math.floor(sorted.length * 0.96)] ||
    Math.max(...blocks) ||
    0.0001;
  const range = Math.max(ceiling - noiseFloor, 0.0001);

  return blocks.map((value) => {
    if (value <= noiseFloor * 1.08) return 0;

    const normalized = Math.min(
      1,
      Math.max(0, (value - noiseFloor) / range),
    );

    return Math.max(1, Math.min(31, Math.round(Math.pow(normalized, 0.72) * 31)));
  });
}

async function startWaveformCapture(stream) {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  state.recorderWaveformSamples = [];
  state.recorderWaveformLastSampleAt = 0;

  if (!AudioContextClass) {
    resetLiveRecordWave();
    return;
  }

  let context;

  try {
    context = new AudioContextClass({
      sampleRate: 48000,
      latencyHint: "interactive",
    });
  } catch {
    context = new AudioContextClass();
  }

  if (context.state === "suspended") {
    await context.resume();
  }

  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();

  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.18;

  source.connect(analyser);

  state.recorderWaveformContext = context;
  state.recorderWaveformSource = source;
  state.recorderWaveformAnalyser = analyser;
  state.recorderWaveformData = new Float32Array(analyser.fftSize);

  recordWave.classList.add("real-waveform");
  resetLiveRecordWave();

  const capture = (timestamp) => {
    if (!state.recorder || !state.recorderWaveformAnalyser) return;

    if (
      state.recorder.state === "recording" &&
      timestamp - state.recorderWaveformLastSampleAt >= 50
    ) {
      state.recorderWaveformLastSampleAt = timestamp;

      const data = state.recorderWaveformData;
      state.recorderWaveformAnalyser.getFloatTimeDomainData(data);

      let peak = 0;
      let sumSquares = 0;

      for (let index = 0; index < data.length; index += 1) {
        const sample = Math.abs(data[index]);
        peak = Math.max(peak, sample);
        sumSquares += sample * sample;
      }

      const rms = Math.sqrt(sumSquares / data.length);
      const amplitude = peak * 0.36 + rms * 0.64;

      state.recorderWaveformSamples.push(amplitude);
      updateLiveRecordWave(state.recorderWaveformSamples);
    }

    state.recorderWaveformFrame = requestAnimationFrame(capture);
  };

  state.recorderWaveformFrame = requestAnimationFrame(capture);
}

async function stopWaveformCapture() {
  if (state.recorderWaveformFrame) {
    cancelAnimationFrame(state.recorderWaveformFrame);
    state.recorderWaveformFrame = null;
  }

  try {
    state.recorderWaveformSource?.disconnect();
  } catch {}

  try {
    state.recorderWaveformAnalyser?.disconnect();
  } catch {}

  const context = state.recorderWaveformContext;

  state.recorderWaveformSource = null;
  state.recorderWaveformAnalyser = null;
  state.recorderWaveformData = null;
  state.recorderWaveformContext = null;
  state.recorderWaveformLastSampleAt = 0;

  if (context && context.state !== "closed") {
    try {
      await context.close();
    } catch {}
  }

  recordWave.classList.remove("real-waveform");
}

function supportedRecorderMime() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];

  return (
    candidates.find((type) =>
      window.MediaRecorder?.isTypeSupported(type),
    ) || ""
  );
}

function recordingElapsed() {
  const now = Date.now();
  const currentPause =
    state.recorderPausedAt > 0 ? now - state.recorderPausedAt : 0;

  return Math.max(
    0,
    now -
      state.recorderStartedAt -
      state.recorderPausedTotal -
      currentPause,
  );
}

function updateRecordingTimer() {
  recordTimer.textContent = formatDuration(recordingElapsed());
}

function showRecordingBar() {
  state.recorderFinishing = false;

  recordSendButton.disabled = false;
  recordPauseButton.disabled = false;
  recordDeleteButton.disabled = false;

  recordBar.classList.remove("finishing");
  composer.classList.add("hidden");
  recordBar.classList.remove("hidden");

  pauseIcon.classList.remove("hidden");
  resumeIcon.classList.add("hidden");
  recordWave.classList.remove("paused");
  resetLiveRecordWave();
}

function hideRecordingBar() {
  state.recorderFinishing = false;

  if (state.recorderStopTimer) {
    clearTimeout(state.recorderStopTimer);
    state.recorderStopTimer = null;
  }

  recordSendButton.disabled = false;
  recordPauseButton.disabled = false;
  recordDeleteButton.disabled = false;

  recordBar.classList.remove("finishing");
  recordBar.classList.add("hidden");
  composer.classList.remove("hidden");

  recordTimer.textContent = "0:00";
  recordWave.classList.remove("paused");
  recordWave.classList.remove("real-waveform");
  resetLiveRecordWave();
  pauseIcon.classList.remove("hidden");
  resumeIcon.classList.add("hidden");
}

function setRecordingFinishing(finishing) {
  state.recorderFinishing = finishing;
  recordSendButton.disabled = finishing;
  recordPauseButton.disabled = finishing;
  recordDeleteButton.disabled = false;

  recordBar.classList.toggle("finishing", finishing);

  if (finishing) {
    recordTimer.textContent = "ещё 1 сек…";
  } else {
    updateRecordingTimer();
  }
}

function cleanupRecorderStream() {
  state.recorderStream?.getTracks().forEach((track) => track.stop());
  state.recorderStream = null;
}

async function startRecording() {
  if (state.recorder && state.recorder.state !== "inactive") return;

  if (!state.token) {
    handleSessionExpired();
    return;
  }

  if (!state.activeChat) {
    alert("Сначала выберите чат");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    alert("Этот браузер не поддерживает запись голосовых сообщений");
    return;
  }

  try {
    state.recorderStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48000 },
        sampleSize: { ideal: 16 },
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: false },
        latency: { ideal: 0.02 },
      },
    });

    const mimeType = supportedRecorderMime();

    state.recorderChunks = [];
    state.recorderStartedAt = Date.now();
    state.recorderPausedAt = 0;
    state.recorderPausedTotal = 0;
    state.recorderAction = "send";
    state.recorderFinishing = false;

    recordSendButton.disabled = false;
    recordPauseButton.disabled = false;
    recordDeleteButton.disabled = false;
    recordBar.classList.remove("finishing");

    if (state.recorderStopTimer) {
      clearTimeout(state.recorderStopTimer);
      state.recorderStopTimer = null;
    }

    // Waveform capture is optional. A browser AudioContext issue
    // must not prevent the actual voice recording from starting.
    try {
      await startWaveformCapture(state.recorderStream);
    } catch (waveformError) {
      console.warn("Voice waveform unavailable", waveformError);
      await stopWaveformCapture();
      resetLiveRecordWave();
    }

    state.recorder = new MediaRecorder(
      state.recorderStream,
      mimeType
        ? {
            mimeType,
            audioBitsPerSecond: 256000,
          }
        : {
            audioBitsPerSecond: 256000,
          },
    );

    state.recorder.addEventListener("error", (event) => {
      console.error("Voice recorder error", event.error || event);
      state.recorderAction = "delete";
      setUploadStatus(
        "Не удалось записать голосовое. Проверьте доступ к микрофону.",
        true,
      );

      try {
        if (state.recorder?.state !== "inactive") {
          state.recorder.stop();
        }
      } catch {}
    });

    state.recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) state.recorderChunks.push(event.data);
    });

    state.recorder.addEventListener("stop", async () => {
      clearInterval(state.recorderTimer);

      if (state.recorderStopTimer) {
        clearTimeout(state.recorderStopTimer);
        state.recorderStopTimer = null;
      }

      state.recorderFinishing = false;

      const recorder = state.recorder;
      const action = state.recorderAction;
      const durationMs = recordingElapsed();
      const actualMime =
        recorder?.mimeType || mimeType || "audio/webm";

      const chunks = [...state.recorderChunks];
      const waveform = compressRecordingWaveform(
        state.recorderWaveformSamples,
        64,
      );

      state.recorder = null;
      state.recorderChunks = [];
      clearLocalChatActivity();

      await stopWaveformCapture();
      cleanupRecorderStream();
      hideRecordingBar();

      if (action === "delete") return;

      const blob = new Blob(chunks, { type: actualMime });

      if (blob.size < 300 || durationMs < 250) {
        setUploadStatus("Запись получилась слишком короткой", true);
        setTimeout(() => setUploadStatus(""), 2500);
        return;
      }

      const extension = actualMime.includes("mp4") ? "m4a" : "webm";

      try {
        await uploadBlob(
          blob,
          `voice-${Date.now()}.${extension}`,
          "voice",
          durationMs,
          waveform,
        );
      } catch (error) {
        setUploadStatus(error.message, true);
        setTimeout(() => setUploadStatus(""), 4000);
      }
    });

    state.recorder.start(1000);
    setLocalChatActivity("voice");
    showRecordingBar();

    updateRecordingTimer();
    state.recorderTimer = setInterval(updateRecordingTimer, 250);
  } catch (error) {
    await stopWaveformCapture();
    cleanupRecorderStream();
    state.recorder = null;
    clearLocalChatActivity();

    alert(
      error?.name === "NotAllowedError"
        ? "Разрешите браузеру доступ к микрофону"
        : `Не удалось включить микрофон: ${error.message}`,
    );
  }
}

function deleteRecording() {
  if (!state.recorder) return;
  clearLocalChatActivity();

  state.recorderAction = "delete";

  if (state.recorderStopTimer) {
    clearTimeout(state.recorderStopTimer);
    state.recorderStopTimer = null;
  }

  state.recorderFinishing = false;

  if (state.recorder.state !== "inactive") {
    state.recorder.stop();
  } else {
    stopWaveformCapture();
    cleanupRecorderStream();
    hideRecordingBar();
  }
}

function sendRecording() {
  if (!state.recorder || state.recorderFinishing) return;

  state.recorderAction = "send";

  // If the user paused the recording, resume it so the microphone really
  // captures the final one-second tail instead of submitting silence.
  if (state.recorder.state === "paused") {
    state.recorder.resume();

    if (state.recorderPausedAt > 0) {
      state.recorderPausedTotal += Date.now() - state.recorderPausedAt;
      state.recorderPausedAt = 0;
    }

    pauseIcon.classList.remove("hidden");
    resumeIcon.classList.add("hidden");
    recordWave.classList.remove("paused");
  }

  if (state.recorder.state !== "recording") return;

  setRecordingFinishing(true);

  state.recorderStopTimer = setTimeout(() => {
    state.recorderStopTimer = null;

    if (!state.recorder || state.recorder.state === "inactive") return;

    try {
      state.recorder.requestData();
    } catch {
      // The final stop event still flushes the remaining encoded audio.
    }

    state.recorder.stop();
  }, 1000);
}

function toggleRecordingPause() {
  if (!state.recorder || state.recorderFinishing) return;

  if (state.recorder.state === "recording") {
    state.recorder.pause();
    state.recorderPausedAt = Date.now();

    pauseIcon.classList.add("hidden");
    resumeIcon.classList.remove("hidden");
    recordWave.classList.add("paused");
    return;
  }

  if (state.recorder.state === "paused") {
    state.recorder.resume();

    if (state.recorderPausedAt > 0) {
      state.recorderPausedTotal += Date.now() - state.recorderPausedAt;
      state.recorderPausedAt = 0;
    }

    pauseIcon.classList.remove("hidden");
    resumeIcon.classList.add("hidden");
    recordWave.classList.remove("paused");
  }
}

/* MEDIA VIEWER */

function collectViewerMedia() {
  return state.activeMessages.filter(
    (message) =>
      (
        message.kind === "image" ||
        message.kind === "video" ||
        message.kind === "gif" ||
        isGifMessage(message)
      ) &&
      message.media_key,
  );
}

function currentViewerMessage() {
  return state.viewerMedia[state.viewerIndex] || null;
}

function openMediaViewer(mediaKey, autoplayVideo = false) {
  closeUserProfilePanel(true);
  closeSharedChatPanel();

  state.viewerMedia = collectViewerMedia();
  state.viewerIndex = Math.max(
    0,
    state.viewerMedia.findIndex(
      (message) => message.media_key === mediaKey,
    ),
  );
  state.viewerZoomed = false;

  renderMediaViewer(autoplayVideo);

  mediaViewer.classList.remove("hidden");
  document.body.classList.add("viewer-open");
}

function openImageViewer(mediaKey) {
  openMediaViewer(mediaKey, false);
}

function renderMediaViewer(autoplayVideo = false) {
  const message = currentViewerMessage();

  if (!message) {
    closeMediaViewer();
    return;
  }

  stopViewerVideo();
  clearTimeout(state.viewerVideoControlsTimer);

  const url = `/api/media/${encodeURIComponent(message.media_key)}`;
  const isVideo =
    message.kind === "video" ||
    (
      isGifMessage(message) &&
      !String(message.mime_type || "")
        .toLowerCase()
        .startsWith("image/")
    );

  const fileName =
    message.file_name ||
    (
      isGifMessage(message)
        ? "GIF"
        : isVideo
          ? "Видео"
          : "Фотография"
    );

  state.viewerKind = message.kind;

  viewerTitle.textContent = fileName;
  viewerCounter.textContent =
    state.viewerMedia.length > 1
      ? `${state.viewerIndex + 1} из ${state.viewerMedia.length}`
      : "";

  viewerDownload.href = url;
  viewerDownload.download = fileName;

  viewerImage.classList.toggle("hidden", isVideo);
  viewerVideoShell.classList.toggle("hidden", !isVideo);
  viewerZoomButton.classList.toggle("hidden", isVideo);
  viewerPrevButton.disabled = state.viewerMedia.length < 2;
  viewerNextButton.disabled = state.viewerMedia.length < 2;

  if (isVideo) {
    viewerImage.removeAttribute("src");
    mediaViewer.classList.remove("zoomed");
    state.viewerZoomed = false;

    viewerVideo.src = url;
    viewerVideo.load();
    viewerVideo.playbackRate = 1;
    viewerVideo.defaultPlaybackRate = 1;
    viewerVideoSpeedButton.textContent = "1×";
    viewerVideoProgress.value = "0";
    viewerVideoCurrent.textContent = "0:00";
    viewerVideoDuration.textContent = formatDuration(message.duration_ms);
    viewerVideoShell.classList.remove("controls-hidden");
    syncViewerVideoButtons();

    if (autoplayVideo) {
      requestAnimationFrame(async () => {
        try {
          await viewerVideo.play();
        } catch {
          syncViewerVideoButtons();
        }
      });
    }
  } else {
    viewerVideo.removeAttribute("src");
    viewerVideo.load();

    viewerImage.src = url;
    viewerImage.alt = fileName;

    mediaViewer.classList.toggle("zoomed", state.viewerZoomed);
    viewerScroll.scrollTo({ left: 0, top: 0 });
  }
}

function closeMediaViewer() {
  mediaViewer.classList.add("hidden");
  document.body.classList.remove("viewer-open");

  clearTimeout(state.viewerVideoControlsTimer);
  stopViewerVideo();

  viewerImage.removeAttribute("src");
  viewerVideo.removeAttribute("src");
  viewerVideo.load();

  state.viewerMedia = [];
  state.viewerIndex = 0;
  state.viewerZoomed = false;
  state.viewerKind = null;
}

function closeImageViewer() {
  closeMediaViewer();
}

function moveMediaViewer(direction) {
  if (state.viewerMedia.length < 2) return;

  state.viewerIndex =
    (state.viewerIndex + direction + state.viewerMedia.length) %
    state.viewerMedia.length;

  state.viewerZoomed = false;
  renderMediaViewer(false);
}

function moveImageViewer(direction) {
  moveMediaViewer(direction);
}

function toggleViewerZoom() {
  if (state.viewerKind !== "image") return;

  state.viewerZoomed = !state.viewerZoomed;
  mediaViewer.classList.toggle("zoomed", state.viewerZoomed);
}

function stopViewerVideo() {
  if (!viewerVideo) return;

  viewerVideo.pause();
  viewerVideo.currentTime = 0;
  viewerVideoShell?.classList.remove("controls-hidden");
  syncViewerVideoButtons();
}

function toggleViewerVideo() {
  if (state.viewerKind !== "video") return;

  if (viewerVideo.paused || viewerVideo.ended) {
    viewerVideo.play().catch(() => {});
  } else {
    viewerVideo.pause();
  }
}

function syncViewerVideoButtons() {
  const playing = !viewerVideo.paused && !viewerVideo.ended;

  viewerVideoPlayButton
    ?.querySelector(".video-play-icon")
    ?.classList.toggle("hidden", playing);

  viewerVideoPlayButton
    ?.querySelector(".video-pause-icon")
    ?.classList.toggle("hidden", !playing);

  viewerVideoCenterPlay?.classList.toggle("hidden", playing);
  viewerVideoPlayButton.title = playing ? "Пауза" : "Воспроизвести";

  const muted = viewerVideo.muted || viewerVideo.volume === 0;

  viewerVideoMuteButton
    ?.querySelector(".video-volume-icon")
    ?.classList.toggle("hidden", muted);

  viewerVideoMuteButton
    ?.querySelector(".video-muted-icon")
    ?.classList.toggle("hidden", !muted);

  viewerVideoMuteButton.title = muted
    ? "Включить звук"
    : "Выключить звук";
}

function updateViewerVideoProgress() {
  if (!state.viewerVideoSeeking) {
    const duration = viewerVideo.duration;

    viewerVideoProgress.value =
      Number.isFinite(duration) && duration > 0
        ? String(Math.round((viewerVideo.currentTime / duration) * 1000))
        : "0";
  }

  viewerVideoCurrent.textContent =
    formatDuration(viewerVideo.currentTime * 1000);

  viewerVideoDuration.textContent =
    Number.isFinite(viewerVideo.duration)
      ? formatDuration(viewerVideo.duration * 1000)
      : "0:00";
}

function showViewerVideoControls(autoHide = true) {
  if (state.viewerKind !== "video") return;

  clearTimeout(state.viewerVideoControlsTimer);
  viewerVideoShell.classList.remove("controls-hidden");

  if (autoHide && !viewerVideo.paused) {
    state.viewerVideoControlsTimer = setTimeout(() => {
      viewerVideoShell.classList.add("controls-hidden");
    }, 2600);
  }
}

function toggleViewerVideoMute() {
  viewerVideo.muted = !viewerVideo.muted;
  syncViewerVideoButtons();
}

function cycleViewerVideoSpeed() {
  const speeds = [1, 1.25, 1.5, 2];
  const current = speeds.findIndex(
    (speed) => Math.abs(viewerVideo.playbackRate - speed) < 0.04,
  );
  const next = speeds[(Math.max(current, 0) + 1) % speeds.length];

  viewerVideo.playbackRate = next;
  viewerVideo.defaultPlaybackRate = next;
  viewerVideoSpeedButton.textContent = `${next}×`;
  showViewerVideoControls();
}

async function enterViewerVideoFullscreen() {
  const target = viewerVideoShell;

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    if (target.requestFullscreen) {
      await target.requestFullscreen();
    } else if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen();
    }
  } catch (error) {
    console.warn("Fullscreen is unavailable", error);
  }
}

/* EVENTS */

async function openSettings() {
  settingsModal.classList.remove("hidden");
  profileStatus.textContent = "";

  try {
    state.user = await request("/me");
    localStorage.setItem(
      "messenger_user",
      JSON.stringify(state.user),
    );
  } catch (error) {
    profileStatus.textContent =
      error.message ||
      "Не удалось загрузить профиль";
  }

  settingsEmailLabel.textContent =
    state.user?.email ||
    "Email пока не привязан";
  profileNameInput.value =
    state.user?.display_name || "";
  profileUsernameInput.value =
    state.user?.username || "";
  profileBioInput.value =
    state.user?.bio || "";
  profilePhoneInput.value =
    state.user?.phone || "";
  settingsEmailValue.textContent =
    state.user?.email || "Не привязан";

  setAvatarElement(
    settingsAvatar,
    state.user?.display_name ||
      state.user?.email ||
      "M",
    state.user?.avatar_key,
  );

  linkEmailSection.classList.toggle(
    "hidden",
    Boolean(state.user?.email),
  );

  await Promise.all([
    loadSessions(),
    loadBlockedUsers(),
  ]);
}

function profileUsernameError(username) {
  if (username.length < 6) {
    return "Username должен содержать минимум 6 символов";
  }

  if (username.length > 32) {
    return "Username должен содержать максимум 32 символа";
  }

  if (!/^[A-Za-z0-9]+$/.test(username)) {
    return "В username разрешены только английские буквы и цифры";
  }

  return "";
}

async function saveProfile() {
  const displayName =
    profileNameInput.value.trim();
  const username =
    profileUsernameInput.value
      .trim()
      .replace(/^@/, "");
  const phone =
    profilePhoneInput.value
      .trim()
      .replace(/[^\d+]/g, "");
  const bio = profileBioInput.value.trim();

  profileStatus.textContent = "";

  if (!displayName) {
    profileStatus.textContent =
      "Введите имя";
    return;
  }

  if (
    phone &&
    !/^\+[1-9]\d{6,14}$/.test(phone)
  ) {
    profileStatus.textContent =
      "Телефон укажите в формате +77001234567";
    return;
  }

  const usernameError =
    profileUsernameError(username);

  if (usernameError) {
    profileStatus.textContent =
      usernameError;
    return;
  }

  saveProfileButton.disabled = true;
  saveProfileButton.textContent =
    "Сохраняем…";

  try {
    state.user = await request("/me", {
      method: "PATCH",
      body: JSON.stringify({
        displayName,
        phone: phone || undefined,
        username,
        bio,
      }),
    });

    localStorage.setItem(
      "messenger_user",
      JSON.stringify(state.user),
    );

    setAvatarElement(
      selfAvatar,
      state.user.display_name,
      state.user.avatar_key,
    );
    setAvatarElement(
      settingsAvatar,
      state.user.display_name,
      state.user.avatar_key,
    );

    profileStatus.textContent =
      "Профиль сохранён";
    await loadChats(false);
  } catch (error) {
    profileStatus.textContent =
      error.message;
  } finally {
    saveProfileButton.disabled = false;
    saveProfileButton.textContent =
      "Сохранить профиль";
  }
}

function cleanupAvatarCropObjectUrl() {
  if (state.avatarCropObjectUrl) {
    URL.revokeObjectURL(
      state.avatarCropObjectUrl,
    );
    state.avatarCropObjectUrl = null;
  }
}

function closeAvatarCrop() {
  avatarCropModal.classList.add("hidden");
  state.avatarCropImage = null;
  state.avatarCropDragging = false;
  state.avatarCropPointerId = null;
  avatarCropStatus.textContent = "";
  avatarZoomInput.value = "100";
  profileAvatarInput.value = "";
  cleanupAvatarCropObjectUrl();

  avatarCropContext.clearRect(
    0,
    0,
    avatarCropCanvas.width,
    avatarCropCanvas.height,
  );
}

function constrainAvatarCrop() {
  const image = state.avatarCropImage;

  if (!image) return;

  const size = avatarCropCanvas.width;
  const scale =
    state.avatarCropBaseScale *
    state.avatarCropZoom;
  const drawnWidth =
    image.naturalWidth * scale;
  const drawnHeight =
    image.naturalHeight * scale;
  const maxX = Math.max(
    0,
    (drawnWidth - size) / 2,
  );
  const maxY = Math.max(
    0,
    (drawnHeight - size) / 2,
  );

  state.avatarCropOffsetX = Math.max(
    -maxX,
    Math.min(maxX, state.avatarCropOffsetX),
  );
  state.avatarCropOffsetY = Math.max(
    -maxY,
    Math.min(maxY, state.avatarCropOffsetY),
  );
}

function drawAvatarCrop(
  context = avatarCropContext,
  size = avatarCropCanvas.width,
) {
  const image = state.avatarCropImage;

  if (!image) return;

  constrainAvatarCrop();

  const previewSize =
    avatarCropCanvas.width;
  const factor = size / previewSize;
  const scale =
    state.avatarCropBaseScale *
    state.avatarCropZoom *
    factor;
  const drawnWidth =
    image.naturalWidth * scale;
  const drawnHeight =
    image.naturalHeight * scale;
  const x =
    (size - drawnWidth) / 2 +
    state.avatarCropOffsetX * factor;
  const y =
    (size - drawnHeight) / 2 +
    state.avatarCropOffsetY * factor;

  context.save();
  context.clearRect(0, 0, size, size);
  context.fillStyle = "#111b21";
  context.fillRect(0, 0, size, size);
  context.drawImage(
    image,
    x,
    y,
    drawnWidth,
    drawnHeight,
  );
  context.restore();
}

async function openAvatarCrop(file) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    profileStatus.textContent =
      "Выберите изображение";
    profileAvatarInput.value = "";
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    profileStatus.textContent =
      "Максимальный размер фотографии — 25 МБ";
    profileAvatarInput.value = "";
    return;
  }

  cleanupAvatarCropObjectUrl();

  const objectUrl =
    URL.createObjectURL(file);
  const image = new Image();

  state.avatarCropObjectUrl =
    objectUrl;
  avatarCropStatus.textContent =
    "Загружаем фотографию…";

  image.onload = () => {
    state.avatarCropImage = image;
    state.avatarCropBaseScale = Math.max(
      avatarCropCanvas.width /
        image.naturalWidth,
      avatarCropCanvas.height /
        image.naturalHeight,
    );
    state.avatarCropZoom = 1;
    state.avatarCropOffsetX = 0;
    state.avatarCropOffsetY = 0;
    avatarZoomInput.value = "100";
    avatarCropStatus.textContent = "";
    avatarCropModal.classList.remove(
      "hidden",
    );
    drawAvatarCrop();
  };

  image.onerror = () => {
    cleanupAvatarCropObjectUrl();
    profileAvatarInput.value = "";
    profileStatus.textContent =
      "Не удалось открыть изображение";
  };

  image.src = objectUrl;
}

async function uploadAuthenticatedForm(form) {
  let response = await fetch(
    `${API}/media/upload`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Authorization:
          `Bearer ${state.token}`,
      },
      body: form,
    },
  );

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();

    if (refreshed === "ok") {
      response = await fetch(
        `${API}/media/upload`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Authorization:
              `Bearer ${state.token}`,
          },
          body: form,
        },
      );
    } else if (refreshed === "unauthorized") {
      handleSessionExpired();
      throw new Error("Сессия истекла. Войдите снова.");
    }
  }

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Ошибка загрузки ${response.status}`,
    );
  }

  return data;
}

async function saveCroppedAvatar() {
  if (!state.avatarCropImage) return;

  avatarCropSaveButton.disabled = true;
  avatarCropSaveButton.textContent =
    "Сохраняем…";
  avatarCropStatus.textContent =
    "Подготавливаем фотографию…";

  try {
    const output = document.createElement(
      "canvas",
    );
    output.width = 512;
    output.height = 512;
    const outputContext =
      output.getContext("2d");

    drawAvatarCrop(
      outputContext,
      output.width,
    );

    const blob = await new Promise(
      (resolve, reject) => {
        output.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(
              new Error(
                "Не удалось обработать фотографию",
              ),
            );
          },
          "image/jpeg",
          0.9,
        );
      },
    );

    const form = new FormData();
    form.append(
      "file",
      blob,
      `avatar-${Date.now()}.jpg`,
    );

    avatarCropStatus.textContent =
      "Загружаем фотографию…";

    const uploaded =
      await uploadAuthenticatedForm(form);

    state.user = await request("/me", {
      method: "PATCH",
      body: JSON.stringify({
        avatarKey: uploaded.key,
      }),
    });

    localStorage.setItem(
      "messenger_user",
      JSON.stringify(state.user),
    );

    setAvatarElement(
      selfAvatar,
      state.user.display_name,
      state.user.avatar_key,
    );
    setAvatarElement(
      settingsAvatar,
      state.user.display_name,
      state.user.avatar_key,
    );

    profileStatus.textContent =
      "Фотография профиля сохранена";
    closeAvatarCrop();
    await loadChats(false);
  } catch (error) {
    avatarCropStatus.textContent =
      error.message;
  } finally {
    avatarCropSaveButton.disabled = false;
    avatarCropSaveButton.textContent =
      "Сохранить фотографию";
  }
}

async function requestLinkEmail() {
  const email = linkEmailInput.value.trim().toLowerCase();

  if (!email) {
    linkEmailHint.textContent = "Введите email";
    return;
  }

  linkEmailButton.disabled = true;
  linkEmailHint.textContent = "Отправляем письмо…";

  try {
    const result = await request("/auth/link-email/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    linkEmailCodeInput.value = result.testCode || "";
    verifyLinkEmailButton.classList.remove("hidden");
    linkEmailButton.classList.add("hidden");
    linkEmailHint.textContent = result.testCode
      ? `Тестовый код: ${result.testCode}`
      : `Код отправлен на ${email}`;
  } catch (error) {
    linkEmailHint.textContent = error.message;
  } finally {
    linkEmailButton.disabled = false;
  }
}

async function verifyLinkEmail() {
  const email = linkEmailInput.value.trim().toLowerCase();
  const code = linkEmailCodeInput.value.trim();

  if (!/^\d{6}$/.test(code)) {
    linkEmailHint.textContent = "Введите шестизначный код";
    return;
  }

  verifyLinkEmailButton.disabled = true;
  verifyLinkEmailButton.textContent = "Проверяем…";

  try {
    const payload = await request("/auth/link-email/verify", {
      method: "POST",
      body: JSON.stringify({
        email,
        code,
        deviceName: browserDeviceName(),
      }),
    });

    saveSessionPayload(payload);
    state.user = payload.user;
    localStorage.setItem("messenger_user", JSON.stringify(state.user));

    settingsEmailLabel.textContent = state.user.email;
    linkEmailSection.classList.add("hidden");
    await loadSessions();
    alert("Email успешно привязан");
  } catch (error) {
    linkEmailHint.textContent = error.message;
  } finally {
    verifyLinkEmailButton.disabled = false;
    verifyLinkEmailButton.textContent = "Подтвердить";
  }
}

async function loadSessions() {
  sessionsList.innerHTML = '<div class="loading">Загружаем устройства…</div>';

  try {
    const sessions = await request("/auth/sessions");

    sessionsList.innerHTML = sessions.length
      ? sessions.map((session) => `
          <div class="session-item">
            <div class="session-info">
              <strong>
                ${escapeHtml(session.deviceName)}
                ${session.current ? '<span class="current-session">текущее</span>' : ""}
              </strong>
              <span>
                ${escapeHtml(session.ipAddress || "IP неизвестен")} ·
                ${escapeHtml(formatSessionDate(session.lastSeenAt))}
              </span>
            </div>
            <button
              type="button"
              class="session-revoke"
              data-session-id="${session.id}"
            >
              Завершить
            </button>
          </div>
        `).join("")
      : '<div class="empty-list">Активных сессий нет</div>';

    sessionsList.querySelectorAll(".session-revoke").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!(await window.MeetusConfirm("Завершить эту сессию?", {
          danger: true,
          confirmText: "Завершить",
        }))) return;

        try {
          await request(`/auth/sessions/${button.dataset.sessionId}`, {
            method: "DELETE",
          });

          if (button.dataset.sessionId === state.session?.id) {
            await performLogout(false);
            return;
          }

          await loadSessions();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  } catch (error) {
    sessionsList.innerHTML =
      `<div class="empty-list">${escapeHtml(error.message)}</div>`;
  }
}

function formatSessionDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/* EVENTS */

loginTabButton.addEventListener("click", () => {
  showAuthMode("login");
});

registerTabButton.addEventListener("click", () => {
  showAuthMode("register");
});

loginEmailMethod.addEventListener("click", () => {
  setLoginMethod("email");
});

loginPhoneMethod.addEventListener("click", () => {
  setLoginMethod("phone");
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  requestLoginCode();
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  requestRegistrationCode();
});

recoveryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  requestRecoveryCode();
});

authCodeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  verifyAuthCode();
});

openRecoveryButton.addEventListener("click", () => {
  if (state.loginMethod === "email") {
    recoveryEmailInput.value =
      loginEmailInput.value.trim();
    setRecoveryMethod("email");
  } else {
    recoveryPhoneInput.value =
      loginPhoneInput.value;
    recoveryCountrySelect.value =
      loginCountrySelect.value;
    updateDialCode(
      recoveryCountrySelect,
      recoveryDialCode,
    );
    setRecoveryMethod("phone");
  }

  showAuthMode("recovery");
});

conflictRecoveryButton.addEventListener("click", () => {
  const email =
    registerEmailInput.value.trim();

  if (email) {
    recoveryEmailInput.value = email;
    setRecoveryMethod("email");
  } else {
    recoveryPhoneInput.value =
      registerPhoneInput.value;
    recoveryCountrySelect.value =
      registerCountrySelect.value;
    updateDialCode(
      recoveryCountrySelect,
      recoveryDialCode,
    );
    setRecoveryMethod("phone");
  }

  showAuthMode("recovery");
});

recoveryEmailMethod.addEventListener("click", () => {
  setRecoveryMethod("email");
});

recoveryPhoneMethod.addEventListener("click", () => {
  setRecoveryMethod("phone");
});

recoveryBackButton.addEventListener("click", () => {
  showAuthMode("login");
});

authCodeBackButton.addEventListener("click", () => {
  showAuthMode(state.authPreviousMode);
});

authResendButton.addEventListener(
  "click",
  resendAuthCode,
);

loginCountrySelect.addEventListener(
  "change",
  () => {
    updateDialCode(
      loginCountrySelect,
      loginDialCode,
    );
  },
);

registerCountrySelect.addEventListener(
  "change",
  () => {
    updateDialCode(
      registerCountrySelect,
      registerDialCode,
    );
  },
);

recoveryCountrySelect.addEventListener(
  "change",
  () => {
    updateDialCode(
      recoveryCountrySelect,
      recoveryDialCode,
    );
  },
);

loginPhoneInput.addEventListener("input", () => {
  loginPhoneInput.value =
    loginPhoneInput.value.replace(
      /[^\d\s()-]/g,
      "",
    );
});

registerUsernameInput.addEventListener("input", () => {
  registerUsernameInput.value =
    registerUsernameInput.value
      .replace(/^@/, "")
      .replace(/\s/g, "");

  registrationConflict.classList.add(
    "hidden",
  );
  scheduleUsernameCheck();
});

registerPhoneInput.addEventListener("input", () => {
  registerPhoneInput.value =
    registerPhoneInput.value.replace(
      /[^\d\s()-]/g,
      "",
    );
});

recoveryPhoneInput.addEventListener("input", () => {
  recoveryPhoneInput.value =
    recoveryPhoneInput.value.replace(
      /[^\d\s()-]/g,
      "",
    );
});

mainMenu.addEventListener(
  "click",
  async (event) => {
    const action =
      event.target.closest("[data-main-action]")
        ?.dataset.mainAction;

    if (!action) return;

    if (action === "profile") {
      toggleMainMenu(false);
      openSettings();
    }

    if (
      action === "group" ||
      action === "channel" ||
      action === "linked"
    ) {
      openCommunityModal(action);
    }

    if (action === "mute") {
      updateMuteUi();
      muteModal.classList.remove("hidden");
      toggleMainMenu(false);
    }

    if (action === "lock") {
      openPinSettings();
    }

    if (action === "logout") {
      toggleMainMenu(false);

      if (await window.MeetusConfirm("Выйти из Meetus на этом устройстве?", {
        danger: false,
        title: "Выход из аккаунта",
        confirmText: "Выйти",
      })) {
        await performLogout(false);
      }
    }
  },
);

communityModalClose.addEventListener(
  "click",
  () => communityModal.classList.add("hidden"),
);

communityModal.addEventListener(
  "click",
  (event) => {
    if (event.target === communityModal) {
      communityModal.classList.add("hidden");
    }
  },
);

communityUsernameInput.addEventListener(
  "input",
  () => {
    communityUsernameInput.value =
      communityUsernameInput.value
        .replace(/^@/, "")
        .replace(/[^A-Za-z0-9]/g, "");
  },
);

communitySearchInput.addEventListener(
  "input",
  () => {
    clearTimeout(
      state.communitySearchTimer,
    );

    state.communitySearchTimer =
      setTimeout(
        () =>
          searchCommunityUsers(
            communitySearchInput.value,
          ),
        350,
      );
  },
);

communityForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();
    submitCommunity();
  },
);

muteModalClose.addEventListener(
  "click",
  () => muteModal.classList.add("hidden"),
);

muteModal
  .querySelectorAll("[data-mute-minutes]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      setAppMute(
        button.dataset.muteMinutes,
      );
    });
  });

muteDisableButton.addEventListener(
  "click",
  disableAppMute,
);

appLockSettingsClose.addEventListener(
  "click",
  () =>
    appLockSettingsModal.classList.add(
      "hidden",
    ),
);

pinSetupInput.addEventListener(
  "input",
  () => sanitizePinInput(pinSetupInput),
);
pinConfirmInput.addEventListener(
  "input",
  () => sanitizePinInput(pinConfirmInput),
);
pinUnlockInput.addEventListener(
  "input",
  () => {
    sanitizePinInput(pinUnlockInput);

    if (pinUnlockInput.value.length === 4) {
      unlockApp();
    }
  },
);

pinEnableButton.addEventListener(
  "click",
  enableAppPin,
);
pinUnlockButton.addEventListener(
  "click",
  unlockApp,
);
pinUnlockInput.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      unlockApp();
    }
  },
);

pinLockNowButton.addEventListener(
  "click",
  () => {
    appLockSettingsModal.classList.add(
      "hidden",
    );
    showPinUnlock();
  },
);

pinChangeButton.addEventListener(
  "click",
  () => {
    pinEnabledActions.classList.add(
      "hidden",
    );
    pinSetupFields.classList.remove(
      "hidden",
    );
    pinSettingsStatus.textContent =
      "Введите новый PIN";
  },
);

pinDisableButton.addEventListener(
  "click",
  disableAppPin,
);

pinResetLogoutButton.addEventListener(
  "click",
  async () => {
    if (
      !(await window.MeetusConfirm(
        "Выйти из аккаунта и сбросить PIN на этом устройстве?",
        {
          danger: true,
          title: "Сбросить PIN?",
          confirmText: "Сбросить и выйти",
        },
      ))
    ) {
      return;
    }

    clearAppPin();
    pinUnlockOverlay.classList.add(
      "hidden",
    );
    await performLogout(false);
    finishBoot();
  },
);

document.addEventListener(
  "pointerdown",
  unlockAudio,
  { once: true },
);

$("refreshButton").addEventListener(
  "click",
  () => loadChats(),
);

$("newChatButton").addEventListener(
  "click",
  () => searchInput.focus(),
);

$("menuButton").addEventListener(
  "click",
  (event) => {
    event.stopPropagation();
    toggleMainMenu();
  },
);

selfAvatar.addEventListener(
  "click",
  openSettings,
);

$("backButton").addEventListener(
  "click",
  () => {
    messengerScreen.classList.remove(
      "chat-open",
    );
  },
);

settingsCloseButton.addEventListener(
  "click",
  () => {
    settingsModal.classList.add("hidden");
  },
);

settingsModal.addEventListener(
  "click",
  (event) => {
    if (event.target === settingsModal) {
      settingsModal.classList.add(
        "hidden",
      );
    }
  },
);

saveProfileButton.addEventListener(
  "click",
  saveProfile,
);

profilePhoneInput.addEventListener(
  "input",
  () => {
    let value = profilePhoneInput.value
      .replace(/[^\d+]/g, "");

    if (value.includes("+")) {
      value =
        "+" +
        value.replace(/\+/g, "");
    }

    profilePhoneInput.value =
      value.slice(0, 16);
  },
);

profileUsernameInput.addEventListener(
  "input",
  () => {
    profileUsernameInput.value =
      profileUsernameInput.value
        .replace(/^@/, "")
        .replace(/\s/g, "");
    profileStatus.textContent = "";
  },
);

profileAvatarButton.addEventListener(
  "click",
  () => profileAvatarInput.click(),
);

profileAvatarInput.addEventListener(
  "change",
  () => {
    openAvatarCrop(
      profileAvatarInput.files?.[0],
    );
  },
);

avatarCropCloseButton.addEventListener(
  "click",
  closeAvatarCrop,
);

avatarCropCancelButton.addEventListener(
  "click",
  closeAvatarCrop,
);

avatarCropModal.addEventListener(
  "click",
  (event) => {
    if (event.target === avatarCropModal) {
      closeAvatarCrop();
    }
  },
);

avatarZoomInput.addEventListener(
  "input",
  () => {
    state.avatarCropZoom =
      Math.max(
        1,
        Number(avatarZoomInput.value) /
          100,
      );
    constrainAvatarCrop();
    drawAvatarCrop();
  },
);

avatarCropCanvas.addEventListener(
  "pointerdown",
  (event) => {
    if (!state.avatarCropImage) return;

    state.avatarCropDragging = true;
    state.avatarCropPointerId =
      event.pointerId;
    state.avatarCropLastX =
      event.clientX;
    state.avatarCropLastY =
      event.clientY;

    avatarCropCanvas.setPointerCapture(
      event.pointerId,
    );
  },
);

avatarCropCanvas.addEventListener(
  "pointermove",
  (event) => {
    if (
      !state.avatarCropDragging ||
      event.pointerId !==
        state.avatarCropPointerId
    ) {
      return;
    }

    const rect =
      avatarCropCanvas.getBoundingClientRect();
    const scaleX =
      avatarCropCanvas.width /
      rect.width;
    const scaleY =
      avatarCropCanvas.height /
      rect.height;

    state.avatarCropOffsetX +=
      (event.clientX -
        state.avatarCropLastX) *
      scaleX;
    state.avatarCropOffsetY +=
      (event.clientY -
        state.avatarCropLastY) *
      scaleY;

    state.avatarCropLastX =
      event.clientX;
    state.avatarCropLastY =
      event.clientY;

    constrainAvatarCrop();
    drawAvatarCrop();
  },
);

function stopAvatarCropDrag(event) {
  if (
    event.pointerId !==
    state.avatarCropPointerId
  ) {
    return;
  }

  state.avatarCropDragging = false;
  state.avatarCropPointerId = null;
}

avatarCropCanvas.addEventListener(
  "pointerup",
  stopAvatarCropDrag,
);
avatarCropCanvas.addEventListener(
  "pointercancel",
  stopAvatarCropDrag,
);

avatarCropSaveButton.addEventListener(
  "click",
  saveCroppedAvatar,
);

linkEmailButton.addEventListener(
  "click",
  requestLinkEmail,
);

verifyLinkEmailButton.addEventListener(
  "click",
  verifyLinkEmail,
);

refreshSessionsButton.addEventListener(
  "click",
  loadSessions,
);

logoutButton.addEventListener(
  "click",
  () => performLogout(false),
);

logoutAllButton.addEventListener(
  "click",
  async () => {
    if (
      !(await window.MeetusConfirm(
        "Завершить все остальные сессии? Текущая сессия останется активной.",
        {
          danger: true,
          title: "Завершить другие сессии?",
          confirmText: "Завершить",
        },
      ))
    ) {
      return;
    }

    logoutAllButton.disabled = true;

    try {
      await request(
        "/auth/logout-all",
        {
          method: "POST",
          auth: true,
          retryAuth: false,
        },
      );

      await loadSessions();
      alert(
        "Все остальные сессии завершены. Текущая сессия сохранена.",
      );
    } catch (error) {
      alert(error.message);
    } finally {
      logoutAllButton.disabled = false;
    }
  },
);

contentPicker
  .querySelectorAll("[data-picker-tab]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      setPickerTab(button.dataset.pickerTab);
    });
  });

contentPickerClose.addEventListener("click", () => {
  toggleContentPicker(false);
});

contentPickerSearch.addEventListener("input", () => {
  clearTimeout(state.gifSearchTimer);

  state.gifSearchTimer = setTimeout(() => {
    searchGifs(contentPickerSearch.value.trim());
  }, 500);
});

mediaPreviewEdit.addEventListener(
  "click",
  openImageEditor,
);

imageEditorClose.addEventListener("click", () => {
  closeImageEditor(true);
});

imageEditorSave.addEventListener(
  "click",
  saveImageEditor,
);

imageEditorModal
  .querySelectorAll("[data-editor-tool]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      setEditorTool(button.dataset.editorTool);
    });
  });

imageEditorText.addEventListener("click", () => {
  setEditorTool("text");
});

imageEditorSticker.addEventListener("click", () => {
  imageEditorStickerTray.classList.toggle("hidden");
});

imageEditorUndo.addEventListener(
  "click",
  undoImageEditor,
);

imageEditorReset.addEventListener(
  "click",
  resetImageEditor,
);

imageEditorCanvas.addEventListener(
  "pointerdown",
  (event) => {
    const point = canvasPoint(event);

    if (state.editorTool === "text") {
      placeEditorText(point);
      setEditorTool("draw");
      return;
    }

    if (state.editorTool === "sticker") {
      placeEditorSticker(point);
      return;
    }

    pushEditorHistory();
    state.editorDrawing = true;
    state.editorLastPoint = point;
    imageEditorCanvas.setPointerCapture(
      event.pointerId,
    );

    if (state.editorTool === "blur") {
      applyMosaic(point);
    }
  },
);

imageEditorCanvas.addEventListener(
  "pointermove",
  (event) => {
    if (!state.editorDrawing) return;

    const point = canvasPoint(event);

    if (state.editorTool === "blur") {
      applyMosaic(point);
    } else {
      drawEditorStroke(
        state.editorLastPoint,
        point,
      );
    }

    state.editorLastPoint = point;
  },
);

function finishEditorPointer(event) {
  state.editorDrawing = false;
  state.editorLastPoint = null;

  try {
    imageEditorCanvas.releasePointerCapture(
      event.pointerId,
    );
  } catch {}
}

imageEditorCanvas.addEventListener(
  "pointerup",
  finishEditorPointer,
);
imageEditorCanvas.addEventListener(
  "pointercancel",
  finishEditorPointer,
);

moreReactionButton.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();
    openReactionPicker(
      state.contextMessage,
    );
  },
);

reactionPickerClose.addEventListener(
  "click",
  closeReactionPicker,
);

reactionPickerSearch.addEventListener(
  "input",
  () =>
    renderReactionPicker(
      reactionPickerSearch.value,
    ),
);

reactionPicker.addEventListener(
  "click",
  (event) => {
    if (event.target === reactionPicker) {
      closeReactionPicker();
    }
  },
);

quickReactionRow
  ?.querySelectorAll("[data-quick-reaction]")
  .forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const message = state.contextMessage;

      if (!message) return;

      await toggleMessageReaction(
        message,
        button.dataset.quickReaction,
      );
      closeMessageContextMenu();
    });
  });

chatsTabButton.addEventListener(
  "click",
  () => setSidebarMode("chats"),
);

contactsTabButton.addEventListener(
  "click",
  () => setSidebarMode("contacts"),
);

requestsTabButton.addEventListener(
  "click",
  () => setSidebarMode("requests"),
);

contactRequestClose.addEventListener(
  "click",
  () =>
    contactRequestModal.classList.add(
      "hidden",
    ),
);

contactRequestSendButton.addEventListener(
  "click",
  sendContactRequest,
);

userProfileClose.addEventListener(
  "click",
  closeUserProfilePanel,
);

viewProfileContactButton.addEventListener(
  "click",
  () => {
    if (state.profileTarget) {
      openContactRequest(
        state.profileTarget,
      );
    }
  },
);

viewProfileRemoveButton.addEventListener(
  "click",
  () => {
    openFriendRemoveConfirmation(
      state.profileTarget,
      true,
    );
  },
);

viewProfileBlockButton.addEventListener(
  "click",
  toggleProfileBlock,
);

friendRemoveClose.addEventListener(
  "click",
  closeFriendRemoveConfirmation,
);

friendRemoveCancel.addEventListener(
  "click",
  closeFriendRemoveConfirmation,
);

friendRemoveConfirm.addEventListener(
  "click",
  confirmFriendRemoval,
);

friendRemoveConfirmInput.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmFriendRemoval();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeFriendRemoveConfirmation();
    }
  },
);

friendRemoveModal.addEventListener(
  "click",
  (event) => {
    if (event.target === friendRemoveModal) {
      closeFriendRemoveConfirmation();
    }
  },
);

viewProfileAcceptButton.addEventListener(
  "click",
  async () => {
    const requestId =
      state.profileTarget?.request_id;

    if (requestId) {
      await answerFriendRequest(
        requestId,
        true,
      );
    }
  },
);

chatAddContactButton.addEventListener(
  "click",
  async () => {
    const peer = state.activeChat?.peer;

    if (!peer) return;

    if (
      peer.friendshipStatus === "incoming" &&
      peer.friendRequestId
    ) {
      await answerFriendRequest(
        peer.friendRequestId,
        true,
      );
      return;
    }

    if (
      peer.friendshipStatus !== "outgoing"
    ) {
      openContactRequest({
        id: peer.id,
        display_name:
          peer.displayName,
        real_display_name:
          peer.realDisplayName,
      });
    }
  },
);

privateLimitContactButton.addEventListener(
  "click",
  () => chatAddContactButton.click(),
);

chatAvatar.addEventListener(
  "click",
  () => {
    const chat = state.activeChat;

    if (!chat) return;

    if (
      chat.type === "private" &&
      chat.peer?.id
    ) {
      openUserProfile(chat.peer.id);
    } else {
      openCommunityManage(chat);
    }
  },
);

chatHeaderInfo.addEventListener(
  "click",
  () => chatAvatar.click(),
);

communityManageClose.addEventListener(
  "click",
  () =>
    communityManageModal.classList.add(
      "hidden",
    ),
);

saveCommunitySettingsButton.addEventListener(
  "click",
  saveCommunitySettings,
);

communityInviteUserSearch.addEventListener(
  "input",
  () => {
    clearTimeout(
      state.communityInviteSearchTimer,
    );

    state.communityInviteSearchTimer =
      setTimeout(
        () =>
          searchCommunityInviteUsers(
            communityInviteUserSearch.value,
          ),
        350,
      );
  },
);

createInviteLinkButton.addEventListener(
  "click",
  createCommunityInvite,
);

copyCreatedInviteButton.addEventListener(
  "click",
  async () => {
    await navigator.clipboard.writeText(
      createdInviteUrl.value,
    );
    communityManageStatus.textContent =
      "Ссылка скопирована";
  },
);

chatMenuButton.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();

    if (!state.activeChat) return;

    updateChatMuteMenuLabel();
    chatHeaderMenu.classList.toggle(
      "hidden",
    );
  },
);

chatHeaderMenu.addEventListener(
  "click",
  async (event) => {
    const action =
      event.target
        .closest("[data-chat-menu-action]")
        ?.dataset.chatMenuAction;

    if (!action) return;

    if (action === "info") {
      closeChatHeaderMenu();
      chatAvatar.click();
      return;
    }

    if (action === "shared") {
      await openSharedChatPanel();
      return;
    }

    if (action === "mute") {
      const status =
        await loadActiveChatMute()
          .catch(() => null);

      if (status?.active) {
        await setActiveChatMute("off");
        closeChatHeaderMenu();
      } else {
        await openChatMuteDialog();
      }
      return;
    }

    if (action === "clear") {
      openChatClearConfirmation();
    }
  },
);

chatDeleteClose.addEventListener(
  "click",
  closeChatDeleteConfirmation,
);

chatDeleteCancel.addEventListener(
  "click",
  closeChatDeleteConfirmation,
);

chatDeleteConfirm.addEventListener(
  "click",
  confirmChatDelete,
);

chatDeleteConfirmInput.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmChatDelete();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeChatDeleteConfirmation();
    }
  },
);

chatDeleteModal.addEventListener(
  "click",
  (event) => {
    if (event.target === chatDeleteModal) {
      closeChatDeleteConfirmation();
    }
  },
);

chatClearClose.addEventListener(
  "click",
  closeChatClearConfirmation,
);

chatClearCancel.addEventListener(
  "click",
  closeChatClearConfirmation,
);

chatClearConfirm.addEventListener(
  "click",
  confirmChatClear,
);

chatClearConfirmInput.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmChatClear();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeChatClearConfirmation();
    }
  },
);

chatClearModal.addEventListener(
  "click",
  (event) => {
    if (event.target === chatClearModal) {
      closeChatClearConfirmation();
    }
  },
);

chatMuteClose.addEventListener(
  "click",
  () =>
    chatMuteModal.classList.add(
      "hidden",
    ),
);

chatMuteModal.addEventListener(
  "click",
  (event) => {
    if (event.target === chatMuteModal) {
      chatMuteModal.classList.add(
        "hidden",
      );
    }
  },
);

chatMuteModal
  .querySelectorAll(
    "[data-chat-mute-minutes]",
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      () =>
        setActiveChatMute(
          button.dataset
            .chatMuteMinutes,
        ),
    );
  });

chatMuteDisable.addEventListener(
  "click",
  () => setActiveChatMute("off"),
);

chatSharedClose.addEventListener(
  "click",
  closeSharedChatPanel,
);

chatSharedPanel.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      chatSharedPanel
    ) {
      closeSharedChatPanel();
    }
  },
);

chatSharedPanel
  .querySelectorAll(
    "[data-shared-tab]",
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        state.sharedChatTab =
          button.dataset.sharedTab;
        renderSharedChatContent();
      },
    );
  });

document.addEventListener(
  "click",
  (event) => {
    if (
      !chatHeaderMenu.classList.contains(
        "hidden",
      ) &&
      !chatHeaderMenu.contains(
        event.target,
      ) &&
      !chatMenuButton.contains(
        event.target,
      )
    ) {
      closeChatHeaderMenu();
    }
  },
);

chatSearchButton.addEventListener(
  "click",
  openDialogSearch,
);

chatSearchClose.addEventListener(
  "click",
  () => closeDialogSearch(true),
);

chatSearchInput.addEventListener(
  "input",
  () => {
    clearTimeout(state.dialogSearchTimer);

    state.dialogSearchTimer =
      setTimeout(
        () =>
          performDialogSearch(
            chatSearchInput.value,
          ),
        260,
      );
  },
);

chatSearchInput.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialogSearch(true);
    }
  },
);

searchInput.addEventListener("input", () => {
  if (state.sidebarMode === "contacts") {
    renderContacts(searchInput.value);
    return;
  }

  if (state.sidebarMode === "requests") {
    return;
  }

  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(
    () => performSearch(searchInput.value),
    240,
  );
});

contactRequestModal.addEventListener(
  "click",
  (event) => {
    if (event.target === contactRequestModal) {
      contactRequestModal.classList.add(
        "hidden",
      );
    }
  },
);

userProfileModal.addEventListener(
  "click",
  (event) => {
    if (event.target === userProfileModal) {
      closeUserProfilePanel();
    }
  },
);

communityManageModal.addEventListener(
  "click",
  (event) => {
    if (event.target === communityManageModal) {
      communityManageModal.classList.add(
        "hidden",
      );
    }
  },
);

document.addEventListener("click", (event) => {
  if (
    !mainMenu.contains(event.target) &&
    !event.target.closest("#menuButton")
  ) {
    toggleMainMenu(false);
  }

  if (
    !searchResults.contains(event.target) &&
    event.target !== searchInput
  ) {
    searchResults.classList.add("hidden");
  }

  if (
    !attachmentMenu.contains(event.target) &&
    event.target !== attachmentButton
  ) {
    toggleAttachmentMenu(false);
  }

  if (
    !contentPicker.contains(event.target) &&
    event.target !== emojiButton
  ) {
    toggleContentPicker(false);
  }

  if (
    !messageContextMenu.contains(event.target) &&
    !event.target.closest(".message-menu-trigger")
  ) {
    closeMessageContextMenu();
  }
});

attachmentButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleAttachmentMenu();
});

attachmentMenu.addEventListener("click", (event) => {
  const action = event.target.closest("[data-attachment-action]")?.dataset.attachmentAction;
  if (!action) return;

  toggleAttachmentMenu(false);

  if (action === "document") documentInput.click();
  if (action === "media") mediaInput.click();
  if (action === "camera") cameraInput.click();
  if (action === "video-camera") videoCaptureInput.click();
  if (action === "audio") audioInput.click();
});

documentInput.addEventListener("change", () => {
  sendSelectedFile(
    documentInput.files?.[0],
    "file",
  );
  documentInput.value = "";
});

audioInput.addEventListener("change", () => {
  sendSelectedFile(
    audioInput.files?.[0],
    "file",
  );
  audioInput.value = "";
});

mediaInput.addEventListener("change", () => {
  openMediaPreview(mediaInput.files || []);
});

cameraInput.addEventListener("change", () => {
  openMediaPreview(cameraInput.files || []);
});

videoCaptureInput.addEventListener("change", () => {
  openMediaPreview(videoCaptureInput.files || []);
});

replyComposerClose.addEventListener("click", clearReplyMessage);

mediaPreviewClose.addEventListener("click", closeMediaPreview);
mediaPreviewAdd.addEventListener("click", () => mediaInput.click());
mediaPreviewPrev.addEventListener("click", () => moveMediaPreview(-1));
mediaPreviewNext.addEventListener("click", () => moveMediaPreview(1));

mediaPreviewEmojiButton.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();
    toggleMediaPreviewEmojiPicker();
  },
);

mediaPreviewEmojiPicker.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();
  },
);

mediaPreviewSend.addEventListener("click", sendPendingMedia);

messageContextMenu.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-message-action]")?.dataset.messageAction;
  const message = state.contextMessage;

  if (!action || !message) return;

  closeMessageContextMenu();

  try {
    if (action === "reply") setReplyMessage(message);
    if (action === "copy") await copyMessageContent(message);
    if (action === "download") downloadMessageMedia(message);
    if (action === "info") openMessageInfo(message);
    if (action === "delete-me") {
      await deleteMessageForScope(
        message,
        "me",
      );
    }
    if (action === "delete-everyone") {
      await deleteMessageForScope(
        message,
        "everyone",
      );
    }
  } catch (error) {
    alert(error.message);
  }
});

messageInfoClose.addEventListener("click", () => {
  messageInfoModal.classList.add("hidden");
});

messageInfoModal.addEventListener("click", (event) => {
  if (event.target === messageInfoModal) {
    messageInfoModal.classList.add("hidden");
  }
});

emojiButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleContentPicker();
});

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  sendTextMessage();
});

messageInput.addEventListener("input", () => {
  resizeMessageInput();
  updateComposerAction();

  if (!state.activeChat) return;

  if (/\p{L}/u.test(messageInput.value)) {
    setLocalChatActivity("typing", 2600);
  } else {
    clearLocalChatActivity();
  }
});

messageInput.addEventListener("blur", () => {
  if (state.localActivity === "typing") clearLocalChatActivity();
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendTextMessage();
  }
});

actionButton.addEventListener("click", () => {
  const permissions = currentChatPermissions();
  const value = messageInput.value.trim();
  if (value && (permissions.text || (permissions.reactions && isEmojiOnlyText(value)))) sendTextMessage();
  else if (permissions.voice) startRecording();
});

recordDeleteButton.addEventListener("click", deleteRecording);
recordSendButton.addEventListener("click", sendRecording);
recordPauseButton.addEventListener("click", toggleRecordingPause);

viewerCloseButton.addEventListener("click", closeMediaViewer);
viewerPrevButton.addEventListener("click", () => moveMediaViewer(-1));
viewerNextButton.addEventListener("click", () => moveMediaViewer(1));
viewerZoomButton.addEventListener("click", toggleViewerZoom);
viewerImage.addEventListener("dblclick", toggleViewerZoom);

viewerVideoCenterPlay.addEventListener("click", toggleViewerVideo);
viewerVideoPlayButton.addEventListener("click", toggleViewerVideo);
viewerVideo.addEventListener("click", toggleViewerVideo);
viewerVideoMuteButton.addEventListener("click", toggleViewerVideoMute);
viewerVideoSpeedButton.addEventListener("click", cycleViewerVideoSpeed);
viewerVideoFullscreenButton.addEventListener(
  "click",
  enterViewerVideoFullscreen,
);

viewerVideo.addEventListener("loadedmetadata", () => {
  viewerVideoDuration.textContent =
    formatDuration(viewerVideo.duration * 1000);
  updateViewerVideoProgress();
});

viewerVideo.addEventListener("timeupdate", updateViewerVideoProgress);
viewerVideo.addEventListener("durationchange", updateViewerVideoProgress);
viewerVideo.addEventListener("play", () => {
  syncViewerVideoButtons();
  showViewerVideoControls();
});
viewerVideo.addEventListener("pause", () => {
  syncViewerVideoButtons();
  showViewerVideoControls(false);
});
viewerVideo.addEventListener("ended", () => {
  syncViewerVideoButtons();
  showViewerVideoControls(false);
});

viewerVideoProgress.addEventListener("pointerdown", () => {
  state.viewerVideoSeeking = true;
  showViewerVideoControls(false);
});

viewerVideoProgress.addEventListener("input", () => {
  const duration = viewerVideo.duration;

  if (Number.isFinite(duration) && duration > 0) {
    const target =
      (Number(viewerVideoProgress.value) / 1000) * duration;
    viewerVideoCurrent.textContent = formatDuration(target * 1000);
  }
});

viewerVideoProgress.addEventListener("change", () => {
  const duration = viewerVideo.duration;

  if (Number.isFinite(duration) && duration > 0) {
    viewerVideo.currentTime =
      (Number(viewerVideoProgress.value) / 1000) * duration;
  }

  state.viewerVideoSeeking = false;
  updateViewerVideoProgress();
  showViewerVideoControls();
});

viewerVideoVolume.addEventListener("input", () => {
  viewerVideo.volume =
    Math.max(0, Math.min(1, Number(viewerVideoVolume.value) / 100));
  viewerVideo.muted = viewerVideo.volume === 0;
  syncViewerVideoButtons();
  showViewerVideoControls();
});

viewerVideoShell.addEventListener("mousemove", () => {
  showViewerVideoControls();
});

viewerVideoControls.addEventListener("click", (event) => {
  event.stopPropagation();
});

viewerScroll.addEventListener(
  "touchstart",
  (event) => {
    state.viewerTouchStartX =
      event.changedTouches[0]?.clientX || 0;
  },
  { passive: true },
);

viewerScroll.addEventListener(
  "touchend",
  (event) => {
    if (state.viewerZoomed || state.viewerKind === "video") return;

    const endX = event.changedTouches[0]?.clientX || 0;
    const distance = endX - state.viewerTouchStartX;

    if (Math.abs(distance) > 55) {
      moveMediaViewer(distance > 0 ? -1 : 1);
    }
  },
  { passive: true },
);

document.addEventListener("fullscreenchange", () => {
  viewerVideoFullscreenButton.classList.toggle(
    "active",
    Boolean(document.fullscreenElement),
  );
});

document.addEventListener("keydown", (event) => {
  if (!mediaViewer.classList.contains("hidden")) {
    if (event.key === "Escape" && !document.fullscreenElement) {
      closeMediaViewer();
      return;
    }

    if (state.viewerKind === "video") {
      if (event.code === "Space") {
        event.preventDefault();
        toggleViewerVideo();
      }

      if (event.key === "ArrowLeft") {
        viewerVideo.currentTime = Math.max(
          0,
          viewerVideo.currentTime - 5,
        );
      }

      if (event.key === "ArrowRight") {
        viewerVideo.currentTime = Math.min(
          viewerVideo.duration || Infinity,
          viewerVideo.currentTime + 5,
        );
      }

      if (event.key.toLowerCase() === "m") {
        toggleViewerVideoMute();
      }

      return;
    }

    if (event.key === "ArrowLeft") moveMediaViewer(-1);
    if (event.key === "ArrowRight") moveMediaViewer(1);
    return;
  }

  if (event.key === "Escape") {
    if (
      !avatarCropModal.classList.contains(
        "hidden",
      )
    ) {
      closeAvatarCrop();
      return;
    }

    mainMenu.classList.add("hidden");
    closeChatHeaderMenu();
    closeSharedChatPanel();
    closeReactionPicker();
    closeChatClearConfirmation();
    closeChatDeleteConfirmation();
    closeSidebarRowMenus();
    chatMuteModal.classList.add("hidden");
    communityModal.classList.add("hidden");
    communityManageModal.classList.add("hidden");
    chatSearchPanel.classList.add("hidden");
    chatSearchResults.classList.add("hidden");
    contactRequestModal.classList.add("hidden");
    closeFriendRemoveConfirmation();
    closeUserProfilePanel();
    muteModal.classList.add("hidden");
    appLockSettingsModal.classList.add("hidden");
    settingsModal.classList.add("hidden");
  }
});

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState ===
        "visible" &&
      state.activeChat?.id
    ) {
      markActiveChatRead(
        state.activeChat.id,
      );
    }

    updateBrowserUnreadBadge();
  },
);

window.addEventListener(
  "focus",
  () => {
    if (state.activeChat?.id) {
      markActiveChatRead(
        state.activeChat.id,
      );
    }

    updateBrowserUnreadBadge();
  },
);

document.addEventListener(
  "click",
  (event) => {
    if (
      !event.target.closest(
        ".sidebar-list-row",
      )
    ) {
      closeSidebarRowMenus();
    }
  },
);

document.addEventListener(
  "click",
  (event) => {
    if (
      !event.target.closest(
        ".media-preview-caption-row",
      )
    ) {
      toggleMediaPreviewEmojiPicker(
        false,
      );
    }
  },
);

communityMemberActionClose.addEventListener("click", () => {
  communityMemberActionModal.classList.add("hidden");
});

communityMemberActionModal.addEventListener("click", (event) => {
  if (event.target === communityMemberActionModal) {
    communityMemberActionModal.classList.add("hidden");
  }
});

communityMemberRoleButton.addEventListener("click", async () => {
  const member = state.communityActionMember;
  const role = communityMemberRoleButton.dataset.nextRole;
  if (!member || !role) return;
  await updateCommunityMemberRole(member.id, role);
  communityMemberActionModal.classList.add("hidden");
});

communityMemberRemoveButton.addEventListener("click", () => moderateCommunityMember("remove"));
communityMemberBanButton.addEventListener("click", () => moderateCommunityMember("ban"));
communityLeaveButton.addEventListener("click", leaveManagedCommunity);
communityDeleteButton.addEventListener("click", deleteManagedCommunity);

bootstrapAuth();
window.addEventListener("beforeunload", () => clearLocalChatActivity());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearLocalChatActivity();
});
