"""
Le XIUHCOATL modelise dans Blender (pilote sans interface), 04/09/2026.

Sylvain : "tu peux modeliser en t'inspirant du scan, tu auras toutes les refs,
du low poly, forcement la meme proportion car c'est ce qu'on veut, mais
aussi une vraie figure animee". References : sculpture complete du British
Museum (silhouette, proportions : queue-signe ~22 %, corps ~48 %, tete ~30 %),
tete monumentale du Templo Mayor (museau en volute, grand oeil cercle,
rangee de cercles le long de la machoire, crocs), description Mexicolore
(pattes avant courtes a griffes, corps segmente, queue = bandes + trapeze +
rayon = signe de l'annee). Rien n'est repris des scans : tout est construit
ici en primitives et courbes.

Axe du corps = +X (museau devant), Z = haut (Blender). L'exporteur glTF
convertit en Y-haut pour le site.

Usage :  blender --background --python xiuhcoatl.py -- <sortie.glb> <dossier_rendus>
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Euler

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_GLB = args[0] if args else os.path.join(os.path.dirname(os.path.abspath(__file__)), "xiuhcoatl.glb")
OUT_DIR = args[1] if len(args) > 1 else os.path.dirname(os.path.abspath(__file__))

L = 4.2            # longueur totale
R = 0.19           # rayon du corps
SEGMENTS = 6
CREST = 5
TAIL_LEN, BODY_LEN, HEAD_LEN = L * 0.22, L * 0.48, L * 0.30
TAIL_START = -L / 2
BODY_START = TAIL_START + TAIL_LEN
HEAD_START = BODY_START + BODY_LEN

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection

# ---------------------------------------------------------------- materiaux
def material(name, color, emission=None, strength=0.0, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    # Couleur de viewport : c'est elle que Workbench affiche en mode MATERIAL.
    shown = tuple(min(1.0, c + (e * min(1.0, strength) * 0.5 if emission else 0)) for c, e in zip(color, emission or color))
    m.diffuse_color = (*shown, 1)
    m.roughness = rough; m.metallic = metal
    return m

MAT_SCALE = material("xiuh_scale", (0.05, 0.42, 0.50), (0.0, 0.25, 0.32), 0.35, rough=0.45, metal=0.15)  # turquoise
MAT_FIRE = material("xiuh_fire", (1.0, 0.35, 0.02), (1.0, 0.42, 0.05), 4.0, rough=0.8)                    # braise
MAT_BONE = material("xiuh_bone", (0.92, 0.87, 0.72), None, 0.0, rough=0.7)                                # os, yeux, griffes
MAT_MOUTH = material("xiuh_mouth", (0.08, 0.03, 0.04), (0.35, 0.05, 0.0), 0.8, rough=0.9)                # gueule sombre, braise au fond
MATS = [MAT_SCALE, MAT_FIRE, MAT_BONE, MAT_MOUTH]

parts = []  # objets a joindre

def link(ob):
    col.objects.link(ob); parts.append(ob); return ob

def new_mesh_object(name, bm, mat):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    for m in MATS: ob.data.materials.append(m)
    idx = MATS.index(mat)
    for p in ob.data.polygons: p.material_index = idx
    return link(ob)

def curve_tube(name, points, radii, bevel=R, res_u=6, bevel_res=1, mat=MAT_SCALE, cyclic=False):
    """Tube le long d'une courbe de Bezier (poignees auto), rayon par point.
    bevel_res=1 -> 8 cotes : low poly."""
    cu = bpy.data.curves.new(name, type="CURVE"); cu.dimensions = "3D"
    cu.bevel_depth = bevel; cu.bevel_resolution = bevel_res; cu.resolution_u = res_u
    cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(points) - 1)
    for p, co, r in zip(sp.bezier_points, points, radii):
        p.co = co; p.handle_left_type = p.handle_right_type = "AUTO"; p.radius = r
    sp.use_cyclic_u = cyclic
    ob = bpy.data.objects.new(name, cu); col.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    for m in MATS: ob.data.materials.append(m)
    idx = MATS.index(mat)
    for p in ob.data.polygons: p.material_index = idx
    ob.select_set(False); parts.append(ob); return ob

def prism(name, verts2d, z0, z1, mat, rot=None, loc=(0, 0, 0)):
    """Prisme extrude d'un polygone (x, y) entre z0 et z1, dans le plan
    local ; `rot` (Euler) et `loc` placent la piece."""
    bm = bmesh.new()
    lo = [bm.verts.new((x, y, z0)) for x, y in verts2d]
    hi = [bm.verts.new((x, y, z1)) for x, y in verts2d]
    bm.faces.new(lo[::-1]); bm.faces.new(hi)
    n = len(lo)
    for i in range(n):
        bm.faces.new((lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]))
    bm.normal_update()
    ob = new_mesh_object(name, bm, mat)
    if rot: ob.rotation_euler = rot
    ob.location = loc
    return ob

def cone(name, base, tip, radius, mat, sides=6):
    bm = bmesh.new()
    axis = (Vector(tip) - Vector(base)).normalized()
    ref = Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((1, 0, 0))
    u = axis.cross(ref).normalized(); v = u.cross(axis)
    ring = [bm.verts.new(Vector(base) + (u * math.cos(a) + v * math.sin(a)) * radius) for a in [i / sides * 2 * math.pi for i in range(sides)]]
    t = bm.verts.new(tip)
    bm.faces.new(ring[::-1])
    for i in range(sides): bm.faces.new((ring[i], ring[(i + 1) % sides], t))
    bm.normal_update()
    return new_mesh_object(name, bm, mat)

def ball(name, center, rx, ry, rz, mat, seg=10, rings=6):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    bmesh.ops.scale(bm, vec=(rx, ry, rz), verts=bm.verts)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    return new_mesh_object(name, bm, mat)

def torus(name, center, major, minor, mat, normal="Y", seg=12, ring=6):
    bm = bmesh.new()
    verts = []
    for i in range(seg):
        a = i / seg * 2 * math.pi
        cx, cz = math.cos(a) * major, math.sin(a) * major
        row = []
        for j in range(ring):
            b = j / ring * 2 * math.pi
            r = major + math.cos(b) * minor
            y = math.sin(b) * minor
            x, z = math.cos(a) * r, math.sin(a) * r
            row.append(bm.verts.new((x, y, z)))
        verts.append(row)
    for i in range(seg):
        for j in range(ring):
            bm.faces.new((verts[i][j], verts[(i + 1) % seg][j], verts[(i + 1) % seg][(j + 1) % ring], verts[i][(j + 1) % ring]))
    bm.normal_update()
    ob = new_mesh_object(name, bm, mat)
    ob.location = center
    if normal == "Z": ob.rotation_euler = (math.pi / 2, 0, 0)
    return ob

# ---------------------------------------------------------------- corps
# Courbe droite le long de X ; le rayon alterne gorge / ventre par segment.
pts, rad = [], []
seg_len = BODY_LEN / SEGMENTS
for s in range(SEGMENTS):
    x0 = BODY_START + s * seg_len
    taper = 0.72 + 0.28 * math.sin((s + 0.5) / SEGMENTS * math.pi)
    for frac, k in ((0.03, 0.72), (0.5, 1.08), (0.97, 0.72)):
        pts.append((x0 + seg_len * frac, 0, 0)); rad.append(taper * k)
body = curve_tube("Body", pts, rad, bevel=R, res_u=4, bevel_res=1)
for v in body.data.vertices: v.co.z *= 0.86; v.co.y *= 1.08
# Gorges en feu : les faces dont le centre est proche d'une frontiere de segment.
for p in body.data.polygons:
    cx = p.center.x
    local = (cx - BODY_START) % seg_len
    if min(local, seg_len - local) < seg_len * 0.09:
        p.material_index = 1

# ---------------------------------------------------------------- crete
for i in range(CREST):
    t = (i + 0.5) / CREST
    x = BODY_START + BODY_LEN * (0.1 + 0.78 * t)
    h = R * (1.3 + 0.6 * math.sin(t * math.pi))
    w = seg_len * 0.42
    prism(f"Crest{i}", [(-w, R * 0.8), (w * 0.55, R * 0.8), (w * 0.15, R * 0.8 + h * 0.55), (-w * 0.7, R * 0.8 + h)], -R * 0.06, R * 0.06, MAT_FIRE, loc=(x, 0, 0))
# les prismes de crete sont dans le plan (x, z) : on les a definis en (x, y) puis
# il faut les tourner pour que y devienne z
for ob in parts:
    if ob.name.startswith("Crest"):
        ob.rotation_euler = (math.pi / 2, 0, 0)

# ---------------------------------------------------------------- queue
band = TAIL_LEN * 0.16
for i in range(3):
    x = BODY_START - band * (i + 0.6)
    k = 0.62 - i * 0.08
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(band * 0.76, R * k * 1.1, R * k * 2.3), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(x, 0, 0), verts=bm.verts)
    new_mesh_object(f"TailBand{i}", bm, MAT_SCALE)
    if i < 2:
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(band * 0.2, R * k * 0.8, R * k * 1.6), verts=bm.verts)
        bmesh.ops.translate(bm, vec=(x - band * 0.5, 0, 0), verts=bm.verts)
        new_mesh_object(f"TailGroove{i}", bm, MAT_FIRE)
# Le signe de l'annee : trapeze dresse (feu) + triangle du rayon (os) qui le traverse.
yx = TAIL_START + TAIL_LEN * 0.26
trapH = R * 1.9
prism("YearTrapeze", [(yx + TAIL_LEN * 0.2, -R * 0.3), (yx - TAIL_LEN * 0.2, -R * 0.3), (yx - TAIL_LEN * 0.34, trapH), (yx + TAIL_LEN * 0.34, trapH)], -R * 0.17, R * 0.17, MAT_FIRE, rot=(math.pi / 2, 0, 0))
prism("YearRay", [(yx - TAIL_LEN * 0.17, trapH * 0.3), (yx + TAIL_LEN * 0.17, trapH * 0.3), (yx, trapH * 1.5)], -R * 0.24, R * 0.24, MAT_BONE, rot=(math.pi / 2, 0, 0))
# Bandes horizontales gravees sur le trapeze (les "bandes paralleles").
for i in range(3):
    zb = trapH * (0.15 + i * 0.22)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(TAIL_LEN * 0.5, R * 0.42, R * 0.07), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(yx, 0, zb), verts=bm.verts)
    new_mesh_object(f"YearBand{i}", bm, MAT_BONE)

# ---------------------------------------------------------------- tete
skull_len = HEAD_LEN * 0.42
snout_len = HEAD_LEN * 0.58
# Cou -> crane (plus haut et plus large que le cou), via un tube a rayon croissant.
skull = curve_tube("Skull",
    [(HEAD_START - R * 0.2, 0, 0), (HEAD_START + skull_len * 0.35, 0, R * 0.08), (HEAD_START + skull_len * 0.75, 0, R * 0.14), (HEAD_START + skull_len, 0, R * 0.2)],
    [0.85, 1.12, 1.1, 0.8], bevel=R, res_u=4, bevel_res=1)
# Museau en volute : avance puis s'enroule vers le haut et l'arriere.
sp_pts, sp_rad = [], []
start = Vector((HEAD_START + skull_len, 0, R * 0.2))
for i in range(11):
    u = i / 10
    if u < 0.4:
        c = start + Vector((u / 0.4 * snout_len * 0.5, 0, u * R * 0.35))
    else:
        a = (u - 0.4) / 0.6 * math.pi * 1.4
        radv = snout_len * 0.27
        cx = start.x + snout_len * 0.5
        cz = start.z + R * 0.14 + radv
        c = Vector((cx + math.sin(a) * radv, 0, cz - math.cos(a) * radv))
    sp_pts.append(tuple(c)); sp_rad.append(0.82 * (1 - u * 0.7))
snout = curve_tube("Snout", sp_pts, sp_rad, bevel=R, res_u=3, bevel_res=1)
# Les yeux de la nuit : petits disques le long du museau, de chaque cote.
for i in (2, 5, 8):
    c = Vector(sp_pts[i]); k = sp_rad[i]
    for side in (1, -1):
        torus(f"NightEye{i}{side}", (c.x, side * R * 0.8 * k * 1.0, c.z), R * 0.2 * k, R * 0.055 * k, MAT_BONE, normal="Y", seg=10, ring=5)
# Machoire inferieure ouverte, plaque inclinee vers le bas ; gueule sombre ; langue.
jaw_x0 = HEAD_START + skull_len * 0.5
jaw = curve_tube("Jaw", [(jaw_x0 - R * 0.3, 0, -R * 0.3), (jaw_x0 + snout_len * 0.3, 0, -R * 0.62), (jaw_x0 + snout_len * 0.72, 0, -R * 0.95)], [0.78, 0.6, 0.3], bevel=R, res_u=3, bevel_res=1)
for v in jaw.data.vertices: v.co.z = -R * 0.3 + (v.co.z + R * 0.3) * 0.55 if v.co.z > -R * 0.3 else v.co.z  # machoire plate dessus
prism("Mouth", [(0, 0), (snout_len * 0.5, 0), (snout_len * 0.5, -R * 0.1), (0, -R * 0.1)], -R * 0.42, R * 0.42, MAT_MOUTH, rot=(math.pi / 2, 0, -0.32), loc=(jaw_x0, 0, -R * 0.22))
prism("Tongue", [(0, R * 0.06), (snout_len * 0.75, 0), (0, -R * 0.06)], -R * 0.12, R * 0.12, MAT_FIRE, rot=(0, 0.35, 0), loc=(jaw_x0 + snout_len * 0.28, 0, -R * 0.5))
# Grand oeil de chaque cote : anneau (os) + pupille (sombre).
for side in (1, -1):
    ec = (HEAD_START + skull_len * 0.6, side * R * 1.02, R * 0.36)
    ball(f"Orbit{side}", ec, R * 0.42, R * 0.16, R * 0.4, MAT_SCALE)                      # bourrelet d'orbite
    torus(f"Eye{side}", (ec[0], ec[1] + side * R * 0.1, ec[2]), R * 0.28, R * 0.075, MAT_BONE, normal="Y", seg=12, ring=6)
    ball(f"Pupil{side}", (ec[0], ec[1] + side * R * 0.12, ec[2]), R * 0.16, R * 0.05, R * 0.16, MAT_MOUTH)
# Crocs recourbes depuis la machoire superieure.
for side in (1, -1):
    b = (jaw_x0 + snout_len * 0.14, side * R * 0.42, -R * 0.2)
    cone(f"Fang{side}", b, (b[0] + R * 0.18, side * R * 0.46, b[2] - R * 0.75), R * 0.11, MAT_BONE)

# ---------------------------------------------------------------- pattes avant
lx = HEAD_START - BODY_LEN * 0.12
for side in (1, -1):
    hip = (lx, side * R * 0.35, -R * 0.2)
    knee = (lx + R * 0.3, side * R * 1.05, -R * 1.0)
    foot = (lx + R * 0.9, side * R * 1.0, -R * 1.45)
    curve_tube(f"Leg{side}", [hip, knee, foot], [0.34, 0.27, 0.22], bevel=R, res_u=3, bevel_res=1)
    for g in (-1, 0, 1):
        cone(f"Claw{side}{g}", foot, (foot[0] + R * 0.6, foot[1] + g * R * 0.22, foot[2] - R * 0.15), R * 0.1, MAT_BONE, sides=5)

# ---------------------------------------------------------------- jonction
bpy.ops.object.select_all(action="DESELECT")
for ob in parts: ob.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
mesh_ob = bpy.context.view_layer.objects.active
mesh_ob.name = "Xiuhcoatl"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
tris = sum(len(p.vertices) - 2 for p in mesh_ob.data.polygons)

# ---------------------------------------------------------------- squelette
arm = bpy.data.armatures.new("XiuhcoatlRig"); rig = bpy.data.objects.new("XiuhcoatlRig", arm); col.objects.link(rig)
bpy.context.view_layer.objects.active = rig; rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
SPINE = 9
xs = [TAIL_START + (L * 0.92) * i / SPINE for i in range(SPINE + 1)]
prev = None
spine_bones = []
for i in range(SPINE):
    b = arm.edit_bones.new(f"spine{i:02d}"); b.head = (xs[i], 0, 0); b.tail = (xs[i + 1], 0, 0)
    if prev: b.parent = prev; b.use_connect = True
    prev = b; spine_bones.append(b.name)
head = arm.edit_bones.new("head"); head.head = (xs[SPINE], 0, 0); head.tail = (xs[SPINE] + HEAD_LEN * 0.55, 0, R * 0.2); head.parent = prev; head.use_connect = True
snoutb = arm.edit_bones.new("snout"); snoutb.head = tuple(head.tail); snoutb.tail = (head.tail.x + snout_len * 0.35, 0, head.tail.z + R * 0.6); snoutb.parent = head; snoutb.use_connect = True
jawb = arm.edit_bones.new("jaw"); jawb.head = (jaw_x0, 0, -R * 0.3); jawb.tail = (jaw_x0 + snout_len * 0.6, 0, -R * 0.75); jawb.parent = head
leg_bones = []
for side, sname in ((1, "L"), (-1, "R")):
    hipb = arm.edit_bones.new(f"leg_{sname}_hip"); hipb.head = (lx, side * R * 0.75, -R * 0.5); hipb.tail = (lx + R * 0.35, side * R * 1.2, -R * 1.25)
    hipb.parent = arm.edit_bones[spine_bones[-2]]
    footb = arm.edit_bones.new(f"leg_{sname}_foot"); footb.head = tuple(hipb.tail); footb.tail = (lx + R * 0.95, side * R * 1.1, -R * 1.55); footb.parent = hipb; footb.use_connect = True
    leg_bones.append((hipb.name, footb.name))
bpy.ops.object.mode_set(mode="OBJECT")
mesh_ob.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

# ---------------------------------------------------------------- animations
scene.render.fps = 24
def action(name, frames, fn):
    act = bpy.data.actions.new(name)
    rig.animation_data_create(); rig.animation_data.action = act
    for f in range(0, frames + 1, 2):
        fn(f, frames)
        for pb in rig.pose.bones: pb.keyframe_insert("rotation_euler", frame=f + 1)
    return act

for pb in rig.pose.bones: pb.rotation_mode = "XYZ"

def slither(f, frames):
    t = f / frames * 2 * math.pi
    for i, name in enumerate(spine_bones):
        pb = rig.pose.bones[name]
        # Onde qui court de la queue a la tete : lacet autour de l'axe vertical
        # (Z, l'os etant le long de X : rotation locale autour de Y = lacet... les os
        # de Blender ont leur axe long en Y local, donc le lacet est Z local).
        pb.rotation_euler = (0.05 * math.sin(t * 2 - i * 0.9), 0, 0.28 * math.sin(t - i * 0.85))
    rig.pose.bones["head"].rotation_euler = (0.06 * math.sin(t * 2), 0, 0.10 * math.sin(t - SPINE * 0.85))
    rig.pose.bones["snout"].rotation_euler = (0.08 * math.sin(t * 2 + 1), 0, 0)
    rig.pose.bones["jaw"].rotation_euler = (0.10 + 0.08 * math.sin(t * 3), 0, 0)
    for k, (hipn, footn) in enumerate(leg_bones):
        ph = t + k * math.pi
        rig.pose.bones[hipn].rotation_euler = (0.45 * math.sin(ph), 0, 0)
        rig.pose.bones[footn].rotation_euler = (0.35 * math.sin(ph + 1.2), 0, 0)

def idle(f, frames):
    t = f / frames * 2 * math.pi
    for i, name in enumerate(spine_bones):
        rig.pose.bones[name].rotation_euler = (0.015 * math.sin(t - i * 0.5), 0, 0.05 * math.sin(t * 0.5 - i * 0.6))
    rig.pose.bones["head"].rotation_euler = (0.04 * math.sin(t), 0, 0.03 * math.sin(t * 0.7))
    rig.pose.bones["snout"].rotation_euler = (0.05 * math.sin(t + 0.5), 0, 0)
    rig.pose.bones["jaw"].rotation_euler = (0.06 + 0.05 * math.sin(t * 1.5), 0, 0)
    for k, (hipn, footn) in enumerate(leg_bones):
        rig.pose.bones[hipn].rotation_euler = (0.08 * math.sin(t + k), 0, 0)
        rig.pose.bones[footn].rotation_euler = (0.06 * math.sin(t + k + 1), 0, 0)

a_sl = action("Slither", 48, slither)
a_idle = action("Idle", 72, idle)
# Les deux actions dans la NLA pour que l'exporteur les emporte toutes les deux.
rig.animation_data.action = None
for act in (a_sl, a_idle):
    track = rig.animation_data.nla_tracks.new(); track.name = act.name
    track.strips.new(act.name, 1, act)
scene.frame_end = 72

# ---------------------------------------------------------------- export
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
mesh_ob.select_set(True); rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format="GLB", export_animations=True, export_apply=True, use_selection=True, export_skins=True, export_nla_strips=True)

# ---------------------------------------------------------------- rendus
os.makedirs(OUT_DIR, exist_ok=True)
try:
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.use_bloom = True if hasattr(scene.eevee, "use_bloom") else None
except Exception:
    scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_specular_highlight = True
# Trois lumieres : zenith dur (le Sud), contre chaud, remplissage froid.
for name, loc, energy, colr in (("Key", (2, -3, 8), 1400, (1.0, 0.97, 0.9)), ("Rim", (-5, 4, 3), 700, (1.0, 0.55, 0.25)), ("Fill", (4, 5, 1), 300, (0.5, 0.75, 0.9))):
    ld = bpy.data.lights.new(name, "POINT"); ld.energy = energy; ld.color = colr
    lo = bpy.data.objects.new(name, ld); col.objects.link(lo); lo.location = loc
scene.render.resolution_x, scene.render.resolution_y = 1400, 900
scene.render.film_transparent = False
world = bpy.data.worlds.new("W"); scene.world = world; world.color = (0.12, 0.11, 0.14)
cam_data = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_data); col.objects.link(cam); scene.camera = cam
cam_data.lens = 50
views = {
    "side": ((0.3, -6.2, 1.0), (math.radians(82), 0, 0)),
    "three-quarter": ((4.6, -4.4, 2.0), (math.radians(68), 0, math.radians(46))),
    "front": ((6.4, -0.8, 1.2), (math.radians(78), 0, math.radians(83))),
}
rig.animation_data.action = a_sl
scene.frame_set(13)
for name, (loc, rot) in views.items():
    cam.location = loc; cam.rotation_euler = rot
    scene.render.filepath = os.path.join(OUT_DIR, f"xiuhcoatl-{name}.png")
    bpy.ops.render.render(write_still=True)
print("OK tris", tris, "bones", len(rig.pose.bones), "->", OUT_GLB)
