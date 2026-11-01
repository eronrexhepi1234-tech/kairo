--[[
	Kairo Assistant – Roblox Studio plugin
	Connects to the Kairo app on this PC (127.0.0.1 only) and builds what Kairo planned:
	parts in one Model and Luau scripts. Every build is one undo step (Ctrl+Z).
	Click the "Kairo" button in the Plugins tab to switch the connection on or off.
]]
local RunService = game:GetService("RunService")
if not RunService:IsEdit() then return end -- only in the editor, not while playtesting

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local Selection = game:GetService("Selection")
local CollectionService = game:GetService("CollectionService")
local StarterPlayer = game:GetService("StarterPlayer")

local URL = "http://127.0.0.1:%PORT%/kairo/"
local KEY = "%KEY%"

local toolbar = plugin:CreateToolbar("Kairo")
local button = toolbar:CreateButton("Kairo", "Mit der Kairo-App verbinden / trennen", "rbxasset://textures/ui/GuiImagePlaceholder.png")
button.ClickableWhenViewportHidden = true
local enabled = plugin:GetSetting("KairoEnabled")
if enabled == nil then enabled = true end
button:SetActive(enabled)
button.Click:Connect(function()
	enabled = not enabled
	plugin:SetSetting("KairoEnabled", enabled)
	button:SetActive(enabled)
	print(enabled and "[Kairo] verbunden" or "[Kairo] getrennt")
end)

local function v3(t, default)
	if type(t) == "table" then
		return Vector3.new(tonumber(t[1]) or default, tonumber(t[2]) or default, tonumber(t[3]) or default)
	end
	return Vector3.new(default, default, default)
end

local function color(hex)
	hex = tostring(hex or "#c8c8c8"):gsub("#", "")
	local r, g, b = tonumber(hex:sub(1, 2), 16), tonumber(hex:sub(3, 4), 16), tonumber(hex:sub(5, 6), 16)
	return Color3.fromRGB(r or 200, g or 200, b or 200)
end

local function enumItem(enumType, name, default)
	local ok, value = pcall(function() return enumType[name] end)
	if ok and value then return value end
	return default
end

local function parentFor(name, model)
	if name == "Model" and model then return model end
	if name == "StarterPlayerScripts" then return StarterPlayer:FindFirstChildOfClass("StarterPlayerScripts") end
	if name == "StarterCharacterScripts" then return StarterPlayer:FindFirstChildOfClass("StarterCharacterScripts") end
	local ok, service = pcall(function() return game:GetService(name) end)
	if ok and service then return service end
	return game:GetService("ServerScriptService")
end

local function build(job)
	local recording = ChangeHistoryService:TryBeginRecording("Kairo: " .. tostring(job.title or "Bau"))
	local log, created, model = {}, 0, nil
	local ok, err = pcall(function()
		if job.parts and #job.parts > 0 then
			local old = workspace:FindFirstChild(job.modelName)
			if old then old.Name = job.modelName .. "_alt" end
			model = Instance.new("Model")
			model.Name = job.modelName
			-- build in front of the camera, on the ground
			local cam = workspace.CurrentCamera
			local origin = Vector3.new(0, 0, 0)
			if cam then
				local p = cam.CFrame.Position + cam.CFrame.LookVector * 60
				origin = Vector3.new(math.floor(p.X), 0, math.floor(p.Z))
			end
			for _, p in ipairs(job.parts) do
				local class = (p.class == "WedgePart" or p.class == "SpawnLocation") and p.class or "Part"
				local part = Instance.new(class)
				part.Name = tostring(p.name or "Teil")
				if class == "Part" and p.shape and p.shape ~= "Block" then
					part.Shape = enumItem(Enum.PartType, p.shape, Enum.PartType.Block)
				end
				part.Size = v3(p.size, 4)
				part.CFrame = CFrame.new(origin + v3(p.pos, 0)) * CFrame.fromOrientation(math.rad(v3(p.rot, 0).X), math.rad(v3(p.rot, 0).Y), math.rad(v3(p.rot, 0).Z))
				part.Color = color(p.color)
				part.Material = enumItem(Enum.Material, tostring(p.material or "SmoothPlastic"), Enum.Material.SmoothPlastic)
				part.Anchored = p.anchored ~= false
				part.CanCollide = p.canCollide ~= false
				part.Transparency = tonumber(p.transparency) or 0
				part.TopSurface = Enum.SurfaceType.Smooth
				part.BottomSurface = Enum.SurfaceType.Smooth
				if p.tag and p.tag ~= "" then CollectionService:AddTag(part, tostring(p.tag)) end
				part.Parent = model
				created += 1
			end
			model.Parent = workspace
			table.insert(log, "Modell " .. model.Name .. " mit " .. created .. " Teilen gebaut")
		end
		for _, s in ipairs(job.scripts or {}) do
			local class = (s.type == "LocalScript" or s.type == "ModuleScript") and s.type or "Script"
			local name = tostring(s.name or "KairoSkript")
			-- "path" = {"ReplicatedStorage", "Shared", "Config"}: missing folders are created on the way
			local parent
			if type(s.path) == "table" and #s.path > 0 then
				parent = parentFor(tostring(s.path[1]), model)
				for i = 2, #s.path do
					local folderName = tostring(s.path[i])
					local child = parent:FindFirstChild(folderName)
					if not child then
						child = Instance.new("Folder")
						child.Name = folderName
						child.Parent = parent
					end
					parent = child
				end
			else
				parent = parentFor(tostring(s.parent or "ServerScriptService"), model)
			end
			-- same script already there: update its code instead of making a copy
			local existing = parent:FindFirstChild(name)
			if existing and existing.ClassName == class then
				existing.Source = tostring(s.source or "")
				table.insert(log, class .. " " .. name .. " aktualisiert")
			else
				local script = Instance.new(class)
				script.Name = name
				script.Source = tostring(s.source or "")
				script.Parent = parent
				table.insert(log, class .. " " .. name .. " in " .. parent:GetFullName())
			end
			created += 1
		end
		if model then Selection:Set({ model }) end
	end)
	if recording then
		ChangeHistoryService:FinishRecording(recording, ok and Enum.FinishRecordingOperation.Commit or Enum.FinishRecordingOperation.Cancel)
	end
	if not ok then return false, { tostring(err) }, created end
	print("[Kairo] " .. table.concat(log, " · "))
	return true, log, created
end

local function context()
	local selected, top = {}, {}
	for _, item in ipairs(Selection:Get()) do
		table.insert(selected, item:GetFullName())
		if #selected >= 10 then break end
	end
	for _, child in ipairs(workspace:GetChildren()) do
		if not child:IsA("Terrain") and not child:IsA("Camera") then table.insert(top, child.Name) end
		if #top >= 40 then break end
	end
	return { place = game.Name, selection = selected, workspace = top }
end

local function post(path, data)
	return HttpService:PostAsync(URL .. path, HttpService:JSONEncode(data), Enum.HttpContentType.ApplicationJson)
end

local running = true
plugin.Unloading:Connect(function() running = false end)
task.spawn(function()
	while running do
		if enabled then
			local ok, res = pcall(post, "poll", { key = KEY, context = context() })
			if ok then
				local okJson, data = pcall(function() return HttpService:JSONDecode(res) end)
				if okJson and type(data) == "table" and type(data.job) == "table" then
					local good, log, count = build(data.job)
					pcall(post, "result", { key = KEY, id = data.job.id, ok = good, log = log, created = count })
				end
			end
		end
		task.wait(1)
	end
end)
print("[Kairo] Assistent geladen – Kairo-App öffnen und loslegen")
