"""
Les QUATRE ARBRES CARDINAUX modelises dans Blender (pilote sans interface),
07/09/2026. Le Codex Fejervary-Mayer planche 1 place un arbre a chaque point
et Xiuhtecuhtli, le feu, au centre ; la Library of Congress, qui detient le
manuscrit, nomme les essences (cf docs/da/arbres-cardinaux.md) :

  dore       Est    Pseudobombax ellipticum  amapolli, « shaving brush tree »
  turquoise  Sud    Theobroma cacao          cacahuacuahuitl, le cacao
  cendre     Ouest  Erythrina americana      colorin, tzompancuahuitl (hypothese)
  obsidienne Nord   Ceiba pentandra          pochotl, le kapok

Toutes precolombiennes et mexicaines. Le Centre n'a pas d'arbre : c'est le
foyer.

Echelle : 1 unite = 1 m, comme le reste du site. Les arbres sont modelises
en JEUNES SUJETS de 4,5 a 6 m (un pochotl adulte fait 40 m et ecraserait la
scene) : choix assume, dit dans la doc.

Style : low poly a aretes franches, comme le reste du decor. Materiaux
nommes (Bark, Leaf, Flower, Pod) : les matieres du site sont posees dans
three.

Usage :
  blender --background --python arbres-cardinaux.py -- <dossier_glb> <dossier_rendus>
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_DIR = args[0] if args else os.path.dirname(os.path.abspath(__file__))
RENDER_DIR = args[1] if len(args) > 1 else OUT_DIR

# ---------------------------------------------------------------- especes
# hauteur, rayon du tronc au pied, renflement (0 = droit), courbure du tronc,
# niveaux de branches, angle d'ouverture, longueur des feuilles, largeur,
# lobes (feuille palmee) ou non, fleurs, gousses sur le tronc (cauliflorie).
SPECIES = {
    "pseudobombax": dict(
        height=5.2, base_r=0.16, swell=0.10, lean=0.06, levels=4, spread=0.8,
        branch_len=0.58, leaf_len=0.32, leaf_w=0.12, lobes=5, leaves_per_tip=5,
        flower="brush", pods=0, leaf_up=0.25, seed=11,
    ),
    "cacao": dict(
        height=4.4, base_r=0.09, swell=0.0, lean=0.10, levels=3, spread=1.0,
        branch_len=0.62, leaf_len=0.42, leaf_w=0.14, lobes=0, leaves_per_tip=7,
        flower=None, pods=7, leaf_up=-0.35, seed=23,
    ),
    "erythrina": dict(
        height=5.0, base_r=0.13, swell=0.0, lean=0.16, levels=4, spread=1.05,
        branch_len=0.55, leaf_len=0.26, leaf_w=0.2, lobes=3, leaves_per_tip=5,
        flower="spike", pods=0, leaf_up=0.1, seed=37,
    ),
    "ceiba": dict(
        height=6.0, base_r=0.26, swell=0.22, lean=0.03, levels=4, spread=1.25,
        branch_len=0.66, leaf_len=0.26, leaf_w=0.075, lobes=5, leaves_per_tip=5,
        flower=None, pods=0, leaf_up=0.05, seed=53,
    ),
}

def material(name, color, rough=0.7, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    m.diffuse_color = (*color, 1); m.roughness = rough; m.metallic = metal
    return m

def build(name, cfg):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    col = bpy.data.collections.new(name); scene.collection.children.link(col)
    rnd = random.Random(cfg["seed"])
    MATS = [
        material("Bark", (0.28, 0.2, 0.13), rough=0.85),
        material("Leaf", (0.2, 0.34, 0.14), rough=0.7),
        material("Flower", (0.75, 0.16, 0.14), rough=0.6),
        material("Pod", (0.5, 0.3, 0.1), rough=0.6),
    ]
    parts = []

    def finish(mesh_name, bm, mat_index, smooth=False):
        bm.normal_update()
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        me = bpy.data.meshes.new(mesh_name); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(mesh_name, me)
        for m in MATS: ob.data.materials.append(m)
        for p in ob.data.polygons: p.material_index = mat_index; p.use_smooth = smooth
        col.objects.link(ob); parts.append(ob); return ob

    # ---- une branche : tube effile le long d'un axe, avec une courbure
    def limb(mesh_name, start, direction, length, r0, r1, curve, sides=7):
        bm = bmesh.new()
        steps = 6
        up = Vector((0, 0, 1))
        d = Vector(direction).normalized()
        side = d.cross(up)
        if side.length < 1e-4: side = Vector((1, 0, 0))
        side.normalize()
        rings = []
        pos = Vector(start)
        dd = d.copy()
        for i in range(steps + 1):
            u = i / steps
            r = r0 + (r1 - r0) * u
            n1 = dd.cross(side).normalized() if dd.cross(side).length > 1e-5 else Vector((0, 0, 1))
            n2 = dd.cross(n1).normalized()
            ring = []
            for k in range(sides):
                a = k * 2 * math.pi / sides
                # un peu d'irregularite : l'ecorce n'est pas un cylindre
                rr = r * (1 + 0.12 * math.sin(a * 3 + u * 5))
                ring.append(bm.verts.new(pos + n1 * (math.cos(a) * rr) + n2 * (math.sin(a) * rr)))
            rings.append(ring)
            if i < steps:
                pos = pos + dd * (length / steps)
                # la branche se redresse (courbure vers le haut) puis retombe
                dd = (dd + up * curve / steps).normalized()
        for i in range(steps):
            for k in range(sides):
                bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
        bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
        finish(mesh_name, bm, 0, smooth=True)
        return pos, dd

    # ---- une feuille : plan effile, ou palmee (lobes rayonnants)
    def leaf(mesh_name, at, direction, length, width, lobes):
        bm = bmesh.new()
        d = Vector(direction).normalized()
        up = Vector((0, 0, 1))
        side = d.cross(up)
        if side.length < 1e-4: side = Vector((1, 0, 0))
        side.normalize()
        nrm = d.cross(side).normalized()
        blades = max(1, lobes)
        for b in range(blades):
            if lobes:
                a = (b - (blades - 1) / 2) * (1.6 / blades)
                dir_b = (d * math.cos(a) + side * math.sin(a)).normalized()
                L = length * (0.7 + 0.5 * rnd.random())
            else:
                dir_b = d
                L = length
            w = width * (0.8 + 0.4 * rnd.random())
            perp = dir_b.cross(nrm).normalized()
            base = Vector(at)
            n = 3  # 4 -> 3 (07/09 : le Nord perdait 6 fps, le feuillage etait trop lourd)
            left, right = [], []
            for i in range(n):
                u = i / (n - 1)
                # profil de feuille : etroit a la base, large au milieu, pointu
                hw = w * math.sin(math.pi * (0.12 + 0.88 * u)) ** 0.8 * (1 - 0.15 * u)
                p = base + dir_b * (L * u) - nrm * (0.12 * L * u * u)  # elle retombe
                left.append(bm.verts.new(p - perp * hw))
                right.append(bm.verts.new(p + perp * hw))
            for i in range(n - 1):
                bm.faces.new((left[i], right[i], right[i + 1], left[i + 1]))
        finish(mesh_name, bm, 1, smooth=True)

    # ---- les fleurs
    def brush_flower(mesh_name, at, direction):
        """Pseudobombax : un pinceau de longues etamines."""
        bm = bmesh.new()
        d = Vector(direction).normalized()
        for i in range(14):
            a = rnd.random() * 2 * math.pi
            t = 0.4 + 0.6 * rnd.random()
            side = Vector((math.cos(a), math.sin(a), 0))
            tip = Vector(at) + d * 0.02 + (side * 0.5 + d).normalized() * (0.16 * t)
            r = 0.006
            p0, p1 = Vector(at), tip
            n1 = Vector((1, 0, 0)) if abs(d.z) > 0.9 else d.cross(Vector((0, 0, 1))).normalized()
            n2 = (p1 - p0).normalized().cross(n1).normalized()
            quad = [bm.verts.new(p0 - n1 * r), bm.verts.new(p0 + n1 * r), bm.verts.new(p1 + n1 * r * 0.4), bm.verts.new(p1 - n1 * r * 0.4)]
            bm.faces.new(quad)
            quad2 = [bm.verts.new(p0 - n2 * r), bm.verts.new(p0 + n2 * r), bm.verts.new(p1 + n2 * r * 0.4), bm.verts.new(p1 - n2 * r * 0.4)]
            bm.faces.new(quad2)
        finish(mesh_name, bm, 2, smooth=True)

    def spike_flower(mesh_name, at, direction):
        """Erythrina : un epi de fleurs rouges recourbees."""
        bm = bmesh.new()
        d = Vector(direction).normalized()
        for i in range(7):
            u = i / 6
            base = Vector(at) + d * (0.22 * u)
            L = 0.075 * (1 - 0.3 * u)
            tipd = (d * 0.4 + Vector((0, 0, 1)) * 0.9).normalized()
            n1 = tipd.cross(Vector((0, 0, 1)))
            if n1.length < 1e-4: n1 = Vector((1, 0, 0))
            n1.normalize()
            r = 0.014
            p0, p1 = base, base + tipd * L
            bm.faces.new([bm.verts.new(p0 - n1 * r), bm.verts.new(p0 + n1 * r), bm.verts.new(p1 + n1 * r * 0.2), bm.verts.new(p1 - n1 * r * 0.2)])
        finish(mesh_name, bm, 2, smooth=True)

    def pod(mesh_name, at, direction):
        """Cacao : la cabosse, portee sur le TRONC (cauliflorie)."""
        bm = bmesh.new()
        d = Vector(direction).normalized()
        rings, steps, sides = [], 5, 6
        for i in range(steps + 1):
            u = i / steps
            r = 0.05 * math.sin(math.pi * (0.1 + 0.85 * u)) ** 0.7
            c = Vector(at) + d * (0.22 * u)
            n1 = d.cross(Vector((0, 0, 1)))
            if n1.length < 1e-4: n1 = Vector((1, 0, 0))
            n1.normalize(); n2 = d.cross(n1).normalized()
            ring = []
            for k in range(sides):
                a = k * 2 * math.pi / sides
                # cotes marques : les sillons de la cabosse
                rr = r * (1 + 0.18 * math.cos(a * sides / 2))
                ring.append(bm.verts.new(c + n1 * (math.cos(a) * rr) + n2 * (math.sin(a) * rr)))
            rings.append(ring)
        for i in range(steps):
            for k in range(sides):
                bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
        bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
        finish(mesh_name, bm, 3, smooth=True)

    # ---- le tronc
    H = cfg["height"]
    trunk_top, trunk_dir = limb(
        "Trunk", (0, 0, 0), (cfg["lean"], 0, 1), H * 0.55,
        cfg["base_r"] * (1 + cfg["swell"]), cfg["base_r"] * 0.55, 0.35, sides=9,
    )

    # ---- les branches, en recursif
    def branches(start, direction, length, radius, level):
        if level > cfg["levels"]:
            # les feuilles au bout
            for i in range(cfg["leaves_per_tip"]):
                a = rnd.random() * 2 * math.pi
                d = (Vector(direction) * (0.5 + rnd.random() * 0.5)
                     + Vector((math.cos(a), math.sin(a), cfg["leaf_up"] + rnd.random() * 0.3))).normalized()
                leaf(f"Leaf_{level}_{i}_{rnd.randint(0, 9999)}", start, d, cfg["leaf_len"], cfg["leaf_w"], cfg["lobes"])
            if cfg["flower"] == "brush" and rnd.random() < 0.5:
                brush_flower(f"Flower_{rnd.randint(0, 9999)}", start, Vector(direction))
            if cfg["flower"] == "spike" and rnd.random() < 0.6:
                spike_flower(f"Spike_{rnd.randint(0, 9999)}", start, Vector(direction))
            return
        count = 4 if level == 1 else 3
        for b in range(count):
            a = (b / count) * 2 * math.pi + rnd.random() * 0.6 + level
            spread = cfg["spread"] * (0.8 + 0.4 * rnd.random())
            d = (Vector(direction) + Vector((math.cos(a) * spread, math.sin(a) * spread, -0.1 * level))).normalized()
            L = length * cfg["branch_len"] * (0.8 + 0.4 * rnd.random())
            end, ndir = limb(f"Branch_{level}_{b}_{rnd.randint(0, 999)}", start, d, L, radius, radius * 0.6, 0.5)
            # Feuilles le long des derniers rameaux, pas seulement au bout :
            # sans elles le houppier reste un squelette a bouquets (07/09).
            if level == cfg["levels"]:
                for k in range(1):
                    u = 0.55
                    at = Vector(start) + (Vector(end) - Vector(start)) * u
                    for j in range(2):
                        aa = rnd.random() * 2 * math.pi
                        ld = (Vector(d) * 0.4 + Vector((math.cos(aa), math.sin(aa), cfg["leaf_up"] + rnd.random() * 0.4))).normalized()
                        leaf(f"LeafSide_{level}_{b}_{k}_{j}_{rnd.randint(0, 9999)}", at, ld, cfg["leaf_len"] * 0.85, cfg["leaf_w"], cfg["lobes"])
            branches(end, ndir, L, radius * 0.6, level + 1)

    branches(trunk_top, trunk_dir, H * 0.55, cfg["base_r"] * 0.55, 1)

    # ---- les cabosses sur le tronc (cacao)
    for i in range(cfg["pods"]):
        u = 0.2 + 0.6 * (i / max(1, cfg["pods"] - 1))
        a = rnd.random() * 2 * math.pi
        at = Vector((cfg["lean"] * u * H * 0.55, 0, u * H * 0.55))
        d = Vector((math.cos(a), math.sin(a), -0.75)).normalized()
        pod(f"Pod_{i}", at + d * cfg["base_r"] * 0.7, d)

    # ---- fusion en DEUX objets : le bois (tronc, branches, cabosses) et le
    # FEUILLAGE (feuilles et fleurs). Le site fait pousser le feuillage avec
    # le scroll : il doit pouvoir etre mis a l'echelle a part.
    def join_group(objs, group_name):
        if not objs:
            return None
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        j = bpy.context.view_layer.objects.active
        j.name = group_name
        return j

    wood_parts = [o for o in parts if o.name.startswith(("Trunk", "Branch", "Pod"))]
    leaf_parts = [o for o in parts if not o.name.startswith(("Trunk", "Branch", "Pod"))]
    wood = join_group(wood_parts, "Wood")
    foliage = join_group(leaf_parts, "Foliage")
    # Le feuillage pousse depuis le haut du tronc : on y place son origine,
    # sinon la mise a l'echelle le ferait fondre vers le sol.
    if foliage:
        bpy.context.scene.cursor.location = Vector((0, 0, cfg["height"] * 0.55))
        bpy.ops.object.select_all(action="DESELECT")
        foliage.select_set(True)
        bpy.context.view_layer.objects.active = foliage
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    tris = sum(len(pp.vertices) - 2 for o in (wood, foliage) if o for pp in o.data.polygons)
    out = os.path.join(OUT_DIR, f"tree-{name}.glb")
    os.makedirs(OUT_DIR, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_animations=False, export_apply=True, use_selection=False, export_materials="EXPORT")

    # ---- rendu de controle
    try: scene.render.engine = "BLENDER_EEVEE"
    except Exception: scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x, scene.render.resolution_y = 900, 1100
    try: scene.view_settings.view_transform = "Standard"
    except Exception: pass
    world = bpy.data.worlds.new("W"); scene.world = world; world.color = (0.62, 0.68, 0.78)
    for n, loc, e, c in (("Key", (4, -6, 8), 2500, (1, 0.97, 0.9)), ("Fill", (-5, 4, 3), 900, (0.7, 0.82, 1.0))):
        ld = bpy.data.lights.new(n, "POINT"); ld.energy = e; ld.color = c
        lo = bpy.data.objects.new(n, ld); col.objects.link(lo); lo.location = loc
    cam_data = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_data); col.objects.link(cam); scene.camera = cam
    cam_data.lens = 45
    cam.location = (0, -H * 1.9, H * 0.55)
    d = (Vector((0, 0, H * 0.5)) - cam.location).normalized()
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    os.makedirs(RENDER_DIR, exist_ok=True)
    scene.render.filepath = os.path.join(RENDER_DIR, f"tree-{name}.png")
    bpy.ops.render.render(write_still=True)
    print(f"OK {name} tris {tris} -> {out}")

for name, cfg in SPECIES.items():
    build(name, cfg)
print("ALL DONE")
