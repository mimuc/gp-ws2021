import Vector from './vec'
import Matrix from './mat'
import PriorityQueue from './pq'
import {BufferGeometry} from "three";

class Halfedge {
  constructor() {
    this.vertex = null // Vertex
    this.edge   = null // Edge
    this.face   = null // Face

    this.prev = null   // Halfedge
    this.next = null   // Halfedge
    this.twin = null   // Halfedge
    this.idx  = -1     // Number

    // Hint: try use this variable to record if a halfedge is on the boundary
    this.onBoundary = false // Boolean
  }
  // TODO: you can add more methods if you need here
  vector() {
    return this.next.vertex.position.sub(this.vertex.position)
  }
  angle() {
    const u = this.prev.vector().unit()
    const v = this.next.vector().scale(-1).unit()
    return Math.acos(Math.max(-1, Math.min(1, u.dot(v))))
  }
  cotan() {
    if (this.onBoundary) {
      return 0
    }
    const u = this.prev.vector()
    const v = this.next.vector().scale(-1)
    return u.dot(v) / u.cross(v).norm()
  }
  getVector() {
    const vector = this.twin.vertex.position.sub(this.vertex.position)
    return vector
  }
}

class Edge {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
  // TODO: you can add more methods if you need here
  getVertices(){
    return [this.halfedge.vertex, this.halfedge.twin.vertex]
  }
  getP1(){
    return this.halfedge.vertex;
  }
  getP2(){
    return this.halfedge.twin.vertex;
  }


  faces(fn) {
    // no radial cycle so there can only be between zero two faces at this edge
    let f1 = this.halfedge.face;
    let f2 = this.halfedge.twin.face;
    let i = 0;

    if(this.halfedge.onBoundary || f1 != null){ // onBoundary => no face
      fn(f1, i++)
    }
    if(this.halfedge.twin.onBoundary || f2 != null){
      fn(f2, i++)
    }
  }
  /**
   * Calculates Midpoint of Edge
   * @returns {Vector} Coordinates of Midpoint
   */
  calculateMidpoint(){
    return this.halfedge.vertex.position.add(this.halfedge.twin.vertex.position).scale(0.5);
  }
}

class Face {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
    this.isQuad = false
  }
  // vertices visit all vertices of the given face, and
  // fn is a callback that receives the visited vertices
  // and order index. For example, the usage could be:
  //
  //    f.vertices((vertex, orderIdx) => {
  //      ... // do something for the vertex
  //    })
  //
  // if one does not need to access the order index,
  // one can simply call the function as follows:
  //
  //    f.vertices(v => { ... })
  vertices(fn) {
    // TODO: iterate all vertices.
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.next) {
      fn(h.vertex, i)
      start = false
      i++
    }
  }
  // TODO: you can add more methods if you need here
  halfedges(fn) {
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.next) {
      fn(h, i)
      start = false
      i++
    }
  }
  // normal() {
  //   if (this.halfedge.onBoundary) {
  //     return new Vector(0, 0, 0)
  //   }
  //   const h = this.halfedge
  //   let a = h.vertex.position.sub(h.next.vertex.position)
  //   let b = h.prev.vertex.position.sub(h.vertex.position).scale(-1)
  //   return a.cross(b).unit()
  // }
  normal(){
    let x = this.halfedge.getVector();
    let y = this.halfedge.prev.twin.getVector();
    let triangleNormal = x.cross(y).unit();

    if(this.isQuad){
      let x2 = this.halfedge.prev.prev.getVector();
      let y2 = this.halfedge.next.twin.getVector();
      let secondTriangleNormal = (x2.cross(y2)).unit();
      return triangleNormal.add(secondTriangleNormal).scale(0.5).unit();
    }
    return triangleNormal;
  }

  area() {
    const h = this.halfedge
    if (h.onBoundary) {
      return 0
    }
    let a = h.vertex.position.sub(h.next.vertex.position)
    let b = h.prev.vertex.position.sub(h.vertex.position).scale(-1)
    return a.cross(b).norm() * 0.5
  }

  /**
   * Calculates midpoint of Face
   * @returns {Vector} position of midpoint
   */
  calculateMidpoint(){
    let cnt_face_verts = 0;
    let newPoint = new Vector();
    this.vertices(v => {
      cnt_face_verts++;
      newPoint = newPoint.add(v.position);
    })

    return newPoint.scale(1/cnt_face_verts)
  }
}

class Vertex {
  constructor() {
    this.position = null // Vector
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
    this.uv      = new Vector()   // Fix error in prepare buffer
  }
  normal(method='equal-weighted') {
    let n = new Vector()
    switch (method) {
    case 'equal-weighted':
      // TODO: compute euqally weighted normal of this vertex
      // console.log("vertex: %s (old idx) %s (new idx) - hf: %s",this.oldIdx, this.idx, this.halfedge.oldIdx)
      this.faces(f => { n = n.add(f.normal())})
      return n.unit()
    case 'area-weighted':
      // TODO: compute area weighted normal of this vertex
      this.faces(f => { n = n.add(f.normal().scale(f.area())) })
      return n.unit()
    case 'angle-weighted':
      // TODO: compute angle weighted normal of this vertex
      this.halfedges(h => {
        n = n.add(h.face.normal().scale(h.next.angle()))
      })
      return n.unit()
    default: // undefined
      return new Vector()
    }
  }
  // TODO: you can add more methods if you need here
  faces(fn) {
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.twin.next) {
      if(h.onBoundary) {
        continue
      }
      fn(h.face, i)
      start = false
      i++
    }
  }
  halfedges(fn) {
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.twin.next) {
      fn(h, i)
      start = false
      i++
    }
  }
  vertices(fn) {
    this.halfedges((h, i) => {
      fn(h.next.vertex, i)
    })
  }

  /**
   *
   * @returns {Matrix}
   */
  computeQi(){
    let curr_vertex_pos = this.position;
    let sum_of_Ks = new Matrix();
    this.faces(
        (f, idx) => {
          let normal = f.normal(); //.unit();
          let a = normal.x; let b = normal.y; let c = normal.z;
          let d = -(normal.dot(curr_vertex_pos));

          // calc fundamental error quadric
          let k = new Matrix(
              a*a, a*b, a*c, a*d,
              a*b, b*b, b*c, b*d,
              a*c, b*c, c*c, c*d,
              a*d, b*d, c*d, d*d
          )
          sum_of_Ks = sum_of_Ks.add(k);
        }
    );
    return sum_of_Ks;
  }


}

export class HalfedgeMesh {
  /**
   * constructor constructs the halfedge-based mesh representation.
   *
   * @param {string} data is a text string from an .obj file
   */
  constructor(data) {
    // properties we plan to cache
    this.vertices  = [] // an array of Vertex object
    this.edges     = [] // an array of Edge object
    this.faces     = [] // an array of Face object
    this.halfedges = [] // an array of Halfedge object
    this.boundaries= [] // an array of boundary loops
    let n_bcycles = 0;
    this.isQuadMesh = false


    // TODO: read .obj format and construct its halfedge representation
    // load .obj file
    let indices   = []
    let positions = []
    let lines = data.split('\n')
    let containsQuad = false

    // search for the a quad in the object file
    for (let line of lines) {
      line = line.trim()
      const tokens = line.split(' ')
      switch(tokens[0].trim()) {
        case 'f':
          const isQuad = tokens.length == 5
          containsQuad = containsQuad || isQuad
          break;

      }

      if(containsQuad)
        break;
    }

    for (let line of lines) {
      line = line.trim()
      const tokens = line.split(' ')
      switch(tokens[0].trim()) {
        case 'v':
          positions.push(new Vector(
              parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]),
          ))
          continue
        case 'f':
          const isQuad = tokens.length == 5 // v 1 2 3 4

          // only load indices of vertices
          for (let i = 1; i < tokens.length; i++) {
            indices.push(parseInt((tokens[i].split('/')[0]).trim()) - 1)
          }
          if(containsQuad && !isQuad)
            indices.push(-1)

          continue
      }
    }

    // build the halfedge connectivity
    const edges = new Map()
    let nOfEdges = 3
    if(containsQuad){
      this.isQuadMesh = true
      nOfEdges = 4
    }

    for (let i = 0; i < indices.length; i += nOfEdges) {
      let nFaceEdges = indices[i + (nOfEdges-1)] != -1 && containsQuad  ? 4 : 3
      for (let j = 0; j < nFaceEdges; j++) { // check a face
        let a = indices[i + j]
        let b = indices[i + (j+1)%nFaceEdges]

        if (a > b) {
          let tmp = b
          b = a
          a = tmp
        }

        // store the edge if not exists
        const e = `${a}-${b}`
        if (!edges.has(e)) {
          edges.set(e, [a, b])
        }
      }
    }

    this.vertices   = new Array(positions.length) // for update
    this.edges      = new Array(edges.size)
    this.faces      = new Array(indices.length / nOfEdges)
    this.halfedges  = new Array(edges.size*2)

    const idx2vert = new Map()
    for (let i = 0; i < positions.length; i++) {
      const v = new Vertex()
      v.uv = new Vector(0,0,0)
      v.position = positions[i]
      this.vertices[i] = v
      idx2vert.set(i, v)
    }

    let edgeIndex = 0
    let edgeCount = new Map()
    let existedHalfedges = new Map()
    let hasTwinHalfedge = new Map()
    let trueIndex = 0

    // construct halfedges, edges
    for (let i = 0; i < indices.length; i += nOfEdges) {
      // construct face
      const f = new Face()
      this.faces[i / nOfEdges] = f
      // if it contains quads set default value to true else false
      let isQuad = indices[i + (nOfEdges-1)] != -1 && containsQuad
      let nFaceEdges = isQuad ? 4 : 3

      // construct halfedges of the face
      for (let j = 0; j < nFaceEdges; j++) {
        const he = new Halfedge()
        this.halfedges[i+j] = he
      }

      // construct connectivities of the new halfedges
      for (let j = 0; j < nFaceEdges; j++) {
        // halfedge from vertex a to vertex b
        let a = indices[i + j]
        let b = indices[i + (j+1)%nFaceEdges]

        // halfedge properties
        const he = this.halfedges[trueIndex + j]
        he.next = this.halfedges[trueIndex + (j+1)%nFaceEdges]
        he.prev = this.halfedges[trueIndex + (j+(nFaceEdges-1))%nFaceEdges]
        he.onBoundary = false
        hasTwinHalfedge.set(he, false) // record if the twin of this half edge is constructed

        // point halfedge and vertex a to each other
        const v = idx2vert.get(a)
        he.vertex = v
        v.halfedge = he

        // point halfedge and face to each other
        he.face = f
        f.halfedge = he

        // swap if index a > b, for twin checking
        if (a > b) {
          let tmp = b
          b = a
          a = tmp
        }
        const edgeKey = `${a}-${b}`
        if (existedHalfedges.has(edgeKey)) {
          // if a halfedge between a and b has been created before, then
          // it is the twin halfedge of the current halfedge
          const twin = existedHalfedges.get(edgeKey)
          he.twin = twin
          twin.twin = he
          he.edge = twin.edge

          hasTwinHalfedge.set(he, true)
          hasTwinHalfedge.set(twin, true)
          edgeCount.set(edgeKey, edgeCount.get(edgeKey)+1)
        } else {
          // this is a new halfedge, create the edge
          const e = new Edge()
          this.edges[edgeIndex] = e
          edgeIndex++
          he.edge = e
          e.halfedge = he

          // record newly created edge and halfedge from a to b
          existedHalfedges.set(edgeKey, he)
          edgeCount.set(edgeKey, 1)
        }

        // error checking
        if (edgeCount.get(edgeKey) > 2) {
          throw 'the mesh contains non-manifold edges'
        }
      }

      trueIndex += nFaceEdges
      f.isQuad = isQuad
    }

    // create boundary halfedges and "fake" faces for the boundary cycles
    let halfedgeIndex = trueIndex
    for (let i = 0; i < trueIndex; i++) {
      // if a halfedge has no twin, create a new face and link it
      // the corresponding boundary cycle

      const he = this.halfedges[i]
      if (!hasTwinHalfedge.get(he)) {
        n_bcycles++
        // create face
        const f = new Face()

        // walk along boundary cycle
        let boundaryCycle = []
        let current = he
        do {
          const boundaryHalfedge = new Halfedge()
          this.halfedges[halfedgeIndex] = boundaryHalfedge
          halfedgeIndex++
          boundaryCycle.push(boundaryHalfedge)

          // grab the next halfedge along the boundary that does not
          // have a twin halfedge
          let nextHe = current.next
          while (hasTwinHalfedge.get(nextHe)) {
            nextHe = nextHe.twin.next
          }

          // set the current halfedge's attributes
          boundaryHalfedge.vertex = nextHe.vertex
          boundaryHalfedge.edge = current.edge
          boundaryHalfedge.onBoundary = true

          // point the new halfedge and face to each other
          boundaryHalfedge.face = f
          f.halfedge = boundaryHalfedge

          // point the new halfedge and twin to each other
          boundaryHalfedge.twin = current
          current.twin = boundaryHalfedge

          current = nextHe
        } while (current != he)
        this.boundaries.push(boundaryCycle) // ## adding boundary cycle array

        // link the cycle of boundary halfedges together
        const n = boundaryCycle.length
        for (let j = 0; j < n; j++) {
          boundaryCycle[j].next = boundaryCycle[(j + n - 1) % n]
          boundaryCycle[j].prev = boundaryCycle[(j + 1) % n]
          hasTwinHalfedge.set(boundaryCycle[j], true)
          hasTwinHalfedge.set(boundaryCycle[j].twin, true)
        }
      }
    }
    // allocate indices for all elements
    let index = 0
    this.vertices.forEach(v => {
      v.idx = index++
    })
    index = 0
    this.edges.forEach(e => {
      e.idx = index++
    })
    index = 0
    this.faces.forEach(f => {
      f.idx = index++
    })
    index = 0
    this.halfedges.forEach(he => {
      he.idx = index++
    })

    console.log("finished mesh parsing")
    console.log("boundary cycles: " + this.boundaries.length)
    console.log("boundary[0] length: " + this.boundaries[0]?.length)
    console.log("")
  }
  /**
   * simplify implements the QEM simplification algorithm.
   * @param {number} reduceRatio reduceRatio indicates how much faces
   * should be removed.
   */
  simplify(reduceRatio) {
    // TODO: implement the QEM simplification
    console.log('========= Simplifying with ratio %s ===========', reduceRatio)

    // 1. Compute the Q matrices for all the initial vertices.
    // 2. Select all valid pairs.
    // 3. Compute the optimal contraction target Nv for each valid pair
    // 4. Place all the pairs in a heap keyed on cost with the minimum cost pair at the top.
    // 5. Iteratively remove the pair .v1; v2 / of least cost from the heap, contract this pair, and update the costs of all valid pairs involving v1.
    let Qs = new Map();
    let validPairs = []; // list of edges
    let heap = new PriorityQueue(
        (a, b) => a.error < b.error // min top
    );
    let dbg_heap = new PriorityQueue(
        (a, b) => a.error < b.error // min top
        // (a, b) => a.error > b.error // max top
    );
    let dbg_max_error = Number.MIN_VALUE; // for debugging value range
    let dbg_min_error = Number.MAX_VALUE;
    let dbg_cnt_mat_invertable = 0;
    let dbg_cnt_mat_not_invertable = 0;


    // ## 1. compute Q
    for(let i = 0; i < this.vertices.length; i++){
      let curr_vertex = this.vertices[i];
      // calc Quadratic error
      Qs.set(curr_vertex.idx, curr_vertex.computeQi())
    }

    // ## 2. select valid Pairs
    for(let i = 0; i < this.edges.length; i++){
      validPairs.push(this.edges[i]);
    }

    // ## 3.
    for(let i = 0; i < validPairs.length; i++){
      let edge = validPairs[i];
      let vertices = edge.getVertices();
      let q_1 = Qs.get(vertices[0].idx);
      let q_2 = Qs.get(vertices[1].idx);

      let edgeErrorResult = this.computeEdgeError(q_1,q_2, edge);
      // ## 4. order onto heap
          heap.push(edgeErrorResult);
      dbg_heap.push({
        error: edgeErrorResult.error,
        pair: edge,
        mergePoint: edgeErrorResult.mergePoint.add(new Vector()),
        dbg_Qbar_Invertible: edgeErrorResult.dbg_Qbar_Invertible
      });

      if(edgeErrorResult.dbg_Qbar_Invertible)
        dbg_cnt_mat_invertable++;
      else
        dbg_cnt_mat_not_invertable++;
      dbg_min_error = Math.min(edgeErrorResult.error, dbg_min_error);
      dbg_max_error = Math.max(edgeErrorResult.error, dbg_max_error);
    }

    // ## 5. doEdgeCollapse
    let cnt_total_pairs = validPairs.length;
    let cnt_total_edges = this.edges.length;
    let cnt_total_faces = this.faces.length;
    let cnt_total_vertices = this.vertices.length;
    let reduce_face_goal = cnt_total_faces-Math.round(cnt_total_faces*reduceRatio); // ratio 0 = nothing to reduce, ratio 1 = all to reduce
    let reduce_face_goal_unrounded = cnt_total_faces-(cnt_total_faces*reduceRatio);

    let curr_face_cnt = cnt_total_faces;

    let nxt_idx_vertices = this.vertices.length;
    let nxt_idx_halfedges = this.halfedges.length;
    let nxt_idx_edges = this.edges.length;
    let nxt_idx_faces = this.faces.length;

    // ## Statistics
    console.log("============== Statistics ======================")
    console.log("Vertices: %d, Edges: %d, Faces: %d", cnt_total_vertices, cnt_total_edges, cnt_total_faces);
    console.log("reduce goal: %s, reduce_unrounded: %s", reduce_face_goal, reduce_face_goal_unrounded);
    // console.log("Reducing from %s -> %s", this.vertices.length, "not set");
    console.log("Error Value Range: [%s,%s]", dbg_min_error, dbg_max_error);
    console.log("Qbar invertable: %s", dbg_cnt_mat_invertable);
    console.log("Qbar NOT invertable: %s", dbg_cnt_mat_not_invertable);

    console.log("========= Calculated Errors (initial before decimation) ========")
    let dbg_cnt_collapse_entries_after = 8;
    let dbg_need_to_collapse = dbg_cnt_collapse_entries_after*2 <= cnt_total_pairs;
    for(let i = 0; i < cnt_total_pairs; i++){
      let p = dbg_heap.pop();
      if(i < dbg_cnt_collapse_entries_after || i > (cnt_total_pairs-dbg_cnt_collapse_entries_after-1)){
        console.log("%d - %s: %s", i, p.dbg_Qbar_Invertible, p.error);
      }
      if(i == dbg_cnt_collapse_entries_after && dbg_need_to_collapse){
        console.log("...")
      }
    }
    console.log("========= Starting to Collapse - current face count: %s - goal: %s", curr_face_cnt, reduce_face_goal);

    for(let i = 0; (curr_face_cnt > reduce_face_goal) && (curr_face_cnt > 0); i++){
      let faces_removed = 0;
      let p = heap.pop();
      let e = p.pair; // Edge
      let m = p.mergePoint;
      if(e.idx === -1)
        continue; // outdated edge, ignore

      let real_face_cnt = 0;
      let deleted_face_cnt = 0;
      this.faces.forEach((v_f, index) => {
          if(v_f.idx != -1){
            real_face_cnt++;
          }else{
            deleted_face_cnt++;
          }
        }
      );

      console.log("in collapse: %s - current cnt faces %s || real face count: %s, deleted: %s", i, curr_face_cnt, real_face_cnt, deleted_face_cnt);
      let curr_hf = e.halfedge;
      let curr_hf_twin = curr_hf.twin;
      let curr_p1 = curr_hf.vertex;
      let curr_p2 = curr_hf_twin.vertex;

      // create new vertex along edge
      let new_vertex = new Vertex();
      new_vertex.idx = nxt_idx_vertices++;
      new_vertex.position = (new Vector()).add(m);
      new_vertex.halfedge = curr_hf.prev.twin;

      if(new_vertex.halfedge.idx === -1){
        console.log("new_vertex.halfedge.idx is invalid");
      }

      // connect old halfedges to new vertex
      curr_p1.halfedges(
          (hf, i) => {
            // console.log("overwriting hf: %s, point: %s with point: %s" , hf.idx, hf.vertex.idx, new_vertex.idx)
            hf.vertex = new_vertex;
          }
      );
      curr_p2.halfedges(
          (hf, i) => {
            // console.log("overwriting hf: %s, point: %s with point: %s" , hf.idx, hf.vertex.idx, new_vertex.idx)
            hf.vertex = new_vertex;
          }
      );

      // merge faces and their edges
      [curr_hf, curr_hf_twin].forEach(
          i_hf => {
          let f = i_hf.face;
          if(f != null){
            //     c
            //    / ^
            // L / f \ R
            //  v     \
            //  a----->b
            //   i_hf

            let currFaceIdx = f.idx;
            let l = i_hf.prev;
            let r = i_hf.next;
            let l_e = l.edge;
            let r_e = r.edge;
            let l_t = l.twin;
            let r_t = r.twin;
            let new_edge = new Edge();
            new_edge.idx = nxt_idx_edges++;
            new_edge.halfedge = l_t;


            // update errors
            let c = l.vertex;
            c.old_id = c.idx;
            c.halfedge = r_t;

            l_t.twin = r_t;
            r_t.twin = l_t;
            l_t.edge.idx = -1;
            r_t.edge.idx = -1;
            l_t.edge = new_edge;
            r_t.edge = new_edge;

            // mark as obsolete
            l.idx = -1;
            r.idx = -1;
            l_e.idx = -1;
            r_e.idx = -1;
            f.idx = -1;

            this.edges.push(new_edge);
            faces_removed++;
          }
        }
      );


      // mark current edge, halfedges and vertices as obsolete
      curr_p1.idx = -1;
      curr_p2.idx = -1;
      e.idx = -1;
      curr_hf.idx = -1;
      curr_hf.twin.idx = -1;

      // set new hf of vertex
      this.vertices.push(new_vertex);
      curr_face_cnt -= faces_removed;

      // recalculation the whole heap as it contains outdated pairs/edges
      heap = null;
      heap = new PriorityQueue(
          (a, b) => a.error < b.error // min top
      );

      // TODO instead of recalculating everything just recalculate affected vertices and edges
      // store latest quadric/error value in a map then compare popped edge if the error value is the latest.
      // If not ignore this edge as it has been updated.

      // recalc heap
      if(curr_face_cnt === 0 ){
        break; // no more faces left -> no decimation needed
      }
      for(let v_i = 0; v_i < this.vertices.length; v_i++){
        let vert = this.vertices[v_i];
        if( vert.idx === -1)
          continue;
        Qs.set(vert.idx, vert.computeQi())
      }

      for(let h_i = 0; h_i < this.edges.length; h_i++){
        let edge = this.edges[h_i];
        if( edge.idx === -1)
          continue;

        let vertices = edge.getVertices();
        let q_1 = Qs.get(vertices[0].idx);
        let q_2 = Qs.get(vertices[1].idx);
        let edgeErrorResult = this.computeEdgeError(q_1,q_2, edge);
        heap.push(edgeErrorResult);
      }
      // recalculated edge errors -> continue simplifying
    }
    console.log("========= Finished decimation - current face count: %s - goal was: %s", curr_face_cnt, reduce_face_goal);

    // # cleanup - remove outdated data

    this.edges = this.edges.filter(function(value, index, arr){
      return value.idx >= 0;
    });
    this.halfedges = this.halfedges.filter(function(value, index, arr){
      return value.idx >= 0;
    });
    this.vertices = this.vertices.filter(function(value, index, arr){
      return value.idx >= 0;
    });
    this.faces = this.faces.filter(function(value, index, arr){
      return value.idx >= 0;
    });

    // reset indices
    for(let i = 0; i < this.edges.length; i++){
      this.edges[i].idx = i;
    }
    for(let i = 0; i < this.halfedges.length; i++){
      this.halfedges[i].idx = i;
    }
    for(let i = 0; i < this.vertices.length; i++){
      this.vertices[i].idx = i;
    }
    for(let i = 0; i < this.faces.length; i++){
      this.faces[i].idx = i;
    }
    console.log("Vertices: %d, Edges: %d, Faces: %d", this.vertices.length, this.edges.length, this.faces.length);

    // end of simplify
  }

  // /**
  //  *
  //  * @param {Matrix} Q
  //  * @param {Vector} v
  //  */
  // calc_error(Q, v){
  //   let err =
  //       Q.x00 * v.x*v.x  + 2*Q.x01 * v.x*v.y  + 2*Q.x02 * v.x*v.z  + 2*Q.x03 * v.x +
  //                            Q.x11 * v.y*v.y  + 2*Q.x12 * v.y*v.z  + 2*Q.x13 * v.y +
  //                                                 Q.x22 * v.z*v.z  + 2*Q.x23 * v.z +
  //                                                                      Q.x33;  // = v^t*Q*v
  //   return err;
  // }
  /**
   *
   * @param {Matrix} Q
   * @param {Vector} v point
   */
  calc_error_v2(Q, v){
    // v^t * Q * v = v^t * right

    // Q * v
    let right = Q.mulpos(v);
    let w = Q.x30*v.x + Q.x31*v.y + Q.x32*v.z + Q.x33;

    // v^t * right
    let err = v.x * right.x + v.y * right.y + v.z * right.z + w;
    return err;


    //                  (x)
    //                  (y)
    //                  (z)
    // (x,y,z,w) * Q *  (w) = v^t * Q * v = v^t * r

    //              (r.x)
    //              (r.y)
    //              (r.z)
    // (x,y,z,w) *  (r.w) = v^t * r = v^t * (Q*v)
  }

  /**
   *
   * @param q1 Matrix
   * @param q2 Matrix
   * @returns {{mergePoint: Vector, error: Number}}
   */
  computeEdgeError(q_1,q_2, edge){
    let Qbar = q_1.add(q_2);
    let dbg_Qbar_Invertible = false;
    // compute vbar
    let vbar = new Vector();

    // if(Qbar.det() != 0){
    if (Math.abs(Qbar.det()) > 1e-3) {
      dbg_Qbar_Invertible = true;
      // invertible, one solution
      Qbar.x30 = 0;
      Qbar.x31 = 0;
      Qbar.x32 = 0;
      Qbar.x33 = 1;
      vbar = Qbar.inv().mulpos(new Vector(0,0,0));
    }else{
      // not invertible, 0 or infinite solutions => approximate
      dbg_Qbar_Invertible  = false;

      const n = 16
      const a = edge.halfedge.vertex.position
      const b = edge.halfedge.next.vertex.position
      const d = b.sub(a)
      let beste = -1.0
      let bestv = new Vector()
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const v = a.add(d.scale(t))
        const e = this.calc_error_v2(Qbar,v) // you need implement this yourself, which is calculating v^T q v :)
        if (beste < 0 || e < beste) {
          beste = e
          bestv = v
        }
      }
      vbar = bestv

      // alternative - take mid point, or one of the edge points
      // let v0 = edge.halfedge.vertex;
      // let v1 = edge.halfedge.next.vertex;
      // let err_v1 = this.calc_error_v2(Qbar,v0.position);
      // let err_v2 = this.calc_error_v2(Qbar,v1.position);
      // let vmid = v0.position.add(v1.position).scale(0.5);
      // let err_vmid = this.calc_error_v2(Qbar,vmid);
      //
      // if( (err_v1 < err_v2) && (err_v1 < err_vmid) ){
      //   vbar = v0.position;
      // } else if((err_v2 < err_v1) && (err_v2 < err_vmid)){
      //   vbar = v1.position;
      // } else {
      //   vbar = vmid;
      // }
      // let error_check = this.calc_error_v2(Qbar,vbar);
      // if(error_check != Math.min(err_v1,err_v2,err_vmid)) {
      //   console.log("not mininmum err selected")
      // }

      // let dbg_error_old = this.calc_error(Qbar,vbar);
      // let dbg_errdiff = Math.abs(dbg_error_old-error);
      // if(dbg_errdiff > 1e-3){
      //   console.log("major diff in error calc: new calc %s old calc: %s", error, dbg_error_old)
      // }
    }

    // compute error
    let error = this.calc_error_v2(Qbar,vbar);
    // if(error == 0){
    //   console.log("error is zero");
    // }

    return {pair: edge, error: error, mergePoint: vbar, dbg_Qbar_Invertible: dbg_Qbar_Invertible};
  }

  toThreeGeometry(){


    return new BufferGeometry();
  }

  triangulateMesh(){
    let originalFaces = this.faces;
    let newFaceList = [];

    for(let i = 0; i < this.faces.length; i++){
      // split face if not already triangle
      let currFace = originalFaces[i];

      // TODO

    }

    // reset indices
    for(let i = 0; i < this.faces.length; i++){
      this.faces[i].idx = i;
    }

  }

  subdivide_catmull_clark(iterations = 0){
    iterations = 1;
    console.log("############ Subdivide - Catmull Clark ## iterations: %s ############", iterations);
    for(let iter = 0; iter < iterations; iter++){
      let new_FacePoints = new Map(); // [face.idx, Vertex] midpoint of face
      let new_movedEdgePoints = new Map(); // [edge.idx, Vertex] moved midpoints of new edges
      let edgeMidpoints = new Map(); // [edge.idx, Vector] midpoints of new edges

      let vertexQ = new Map();
      let vertexR = new Map();
      let vertexN = new Map();

      let nextVertexStart = this.vertices.length;
      let nextVertexIndex = nextVertexStart;
      console.log("1. create new FacePoints");

      // 1. create new FacePoints
      for(let i_f = 0; i_f < this.faces.length; i_f++){
        let curr_face = this.faces[i_f];

        let newVert = new Vertex();
        newVert.position = curr_face.calculateMidpoint();
        newVert.idx = nextVertexIndex++;
        this.vertices.push(newVert)

        new_FacePoints.set(curr_face.idx, newVert);
      }
      console.log("2. create newEdgePoints");

      // 2. create newEdgePoints
      for(let i_e = 0; i_e < this.edges.length; i_e++){
        let curr_edge = this.edges[i_e];
        let edgeMidpoint = curr_edge.calculateMidpoint();

        let p1 = curr_edge.getP1();
        let p1_pos = curr_edge.getP1().position;
        let cnt_points = 2;
        let _sumAdjacentPoints = curr_edge.getP1().position.add(curr_edge.getP2().position);
        curr_edge.faces(
            f => {
              cnt_points++;
              _sumAdjacentPoints = _sumAdjacentPoints.add(new_FacePoints.get(f.idx).position);
            }
        );
        let newEdgePos = _sumAdjacentPoints.scale(1/cnt_points);

        let newVert = new Vertex();
        newVert.position = newEdgePos;
        newVert.idx = nextVertexIndex++;
        this.vertices.push(newVert)

        new_movedEdgePoints.set(curr_edge.idx, newVert);
        edgeMidpoints.set(curr_edge.idx, edgeMidpoint);
      }

      // calculate original Point data
      for(let i_v = 0; i_v < nextVertexStart; i_v++){
        // only iterate over original points
        let vertex = this.vertices[i_v];
        let _sum_faces = new Vector();
        let count_faces = 0;
        vertex.faces(
            f => {
              count_faces++;
              _sum_faces = _sum_faces.add(new_FacePoints.get(f.idx).position);
            }
        );
        let Q = _sum_faces.scale(1/count_faces);
        vertexQ.set(vertex.idx, Q);

        let count_edges = 0;
        let _sum_edges = new Vector();
        vertex.halfedges(
            hf => {
              count_edges++;
              _sum_edges = _sum_edges.add(edgeMidpoints.get(hf.edge.idx));
            }
        );
        let R = _sum_edges.scale(1/count_edges);
        vertexR.set(vertex.idx, R);
        vertexN.set(vertex.idx, count_edges);

        let N = count_edges;
        let N_inv = 1/N;
        let S = vertex.position;

        // Q/n + 2R/n + S(n-3)/n
        let newOriginalPointLocation =
            Q.scale(N_inv)                      // Q/n
                .add(
                    R.scale(2).scale(N_inv)  // 2R/n
                )
                .add(
                    S.scale(N-3).scale(N_inv)   // S(n-3)/n
                );
          vertex.position = newOriginalPointLocation;
      }

      // 3. linkup everything up


    }
    console.log("##### Finished Subdivision ####")
    this.exportObj(this.parseToObj(),"cubeExport.obj");

  }

  /**
   * Parses the HalfeEdgeMesh into an .obj compatible format
   * Currently only vertices and faces are exported (e.g. normals are not exported)
   *
   * @returns {Blob} parsing result
   */
  parseToObj(){
    let lineSeperator =  "\n";
    let exp_header = "# Javascript Halfedge implemention Export";
    let exp_objName = "o cubeExport";
    let exp_vertices = "";
    let exp_faces = "";

    // parse into .obj format
    this.vertices.forEach(
        v => {
          let pos = v.position;
          exp_vertices += "v " + pos.x + " " + pos.y + " " + pos.z + lineSeperator
        }
    );

    this.faces.forEach(
        f => {
          // format: f v1 v2 v3 ....
          let line = "f ";
          f.vertices(
              f_v => {
                line += f_v.idx+1 + " "; // +1 as in  obj format index starts at one instead of zero
              }
          )
          exp_faces += line + lineSeperator;
        }
    );

    let objectData =
        exp_header + lineSeperator +
        exp_objName + lineSeperator +
        exp_vertices + // no line sep as there is already one
        exp_faces;
    let type = "text/plain";
    let file = new Blob([objectData], {type: type});
    console.log(objectData);

    return file;
  }

  /**
   * @param {Blob} file_blob
   */
  exportObj(file_blob, filename){
    // start the download
    let file = file_blob;
    if (window.navigator.msSaveOrOpenBlob) // IE10+
      window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
      let a = document.createElement("a"),
          url = URL.createObjectURL(file);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 0);
    }
  }

}