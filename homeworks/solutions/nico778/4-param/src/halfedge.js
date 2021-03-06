// API Usage about @penrose/linear-algebra:
//
//   - There are two types of matrices: SparseMatrix and DenseMatrix
//   - SparseMatrix.identity(n, n) gives you a identity matrix with
//     n x n dimension
//   - Triplet represents a small structure to hold non-zero entries in
//     SparseMatrix, each entry is (x, i, j). To construct a SparseMatrix,
//     here is an example:
//
//       let A = new Triplet(2, 2)          // Triplet for 2x2 SparseMatrix 
//       A.addEntry(1, 0, 0)                // A(0, 0) += 1
//       A.addEntry(2, 1, 1)                // A(1, 1) += 2
//       return SparseMatrix.fromTriplet(T) // Construct SparseMatrix
//
//   - A.lu() returns a sparse LU decomposition.
//   - A.solveSquare(b) solves linear equation Ax=b where A is a
//     LU decomposition, and b is a DenseMatrix, and x is the solution.
//   - For a DenseMatrix A, one can use A.set(x, i, j) for A(i,j)=x,
//     and A.get(i, j) returns A(i,j).
//
// Further APIs regarding @penrose/linear-algebra can be found
// in node_modules/@penrose/linear-algebra/docs/*.html, but the above
// information are all the APIs you need for this project.
import {
  SparseMatrix,
  DenseMatrix,
  Triplet,
} from '@penrose/linear-algebra'
import Vector from './vec'

class Halfedge {
  constructor() {
    this.vertex = null // Vertex
    this.edge   = null // Edge
    this.face   = null // Face

    this.prev = null   // Halfedge
    this.next = null   // Halfedge
    this.twin = null   // Halfedge
    this.idx  = -1     // Number

    this.onBoundary = false // Boolean
  }
  vector() {
    // HACK: using the original vertex
    const a = this.vertsOrig[this.next.vertex.idx]
    const b = this.vertsOrig[this.vertex.idx]
    return a.position.sub(b.position)
  }
  cotan() {
    if (this.onBoundary) {
      return 0
    }
    const u = this.prev.vector()
    const v = this.next.vector().scale(-1)
    return u.dot(v) / u.cross(v).norm()
  }
  angle() {
    const u = this.prev.vector().unit()
    const v = this.next.vector().scale(-1).unit()
    return Math.acos(Math.max(-1, Math.min(1, u.dot(v))))
  }
}

class Edge {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
}

class Face {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
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
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.next) {
      fn(h.vertex, i)
      start = false
      i++
    }
  }
  normal() {
    if (this.halfedge.onBoundary) {
      return new Vector(0, 0, 0)
    }
    const h = this.halfedge
    let a = h.vertex.position.sub(h.next.vertex.position)
    let b = h.prev.vertex.position.sub(h.vertex.position).scale(-1)
    return a.cross(b).unit()
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
}

class Vertex {
  constructor() {
    this.position = null // Vector
    this.uv       = null // Vector
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
  normal(method='equal-weighted') {
    let n = new Vector()
    switch (method) {
    case 'equal-weighted':
      // TODO: compute euqally weighted normal of this vertex
      this.faces(f => {
        n = n.add(f.normal())
      })
      return n.unit()
    case 'area-weighted':
      // TODO: compute area weighted normal of this vertex
      this.faces(f => {
        n = n.add(f.normal().scale(f.area()))
      })
      return n.unit()
    case 'angle-weighted':
      // TODO: compute angle weighted normal of this vertex
      this.halfedges(h => {
        n = n.add(h.face.normal().scale(h.next.angle()))
      })
      return n.unit()
    default: // undefined
      return n
    }
    // let n = new Vector()
    // switch (method) {
    // case 'equal-weighted':
    //   this.faces(f => { n = n.add(f.normal()) })
    //   return n.unit()
    // case 'area-weighted':
    //   this.faces(f => { n = n.add(f.normal().scale(f.area())) })
    //   return n.unit()

    // case 'angle-weighted':
    //   this.halfedges(h => {
    //     n = n.add(h.face.normal().scale(h.next.angle()))
    //   })
    //   return n.unit()

    // default: // undefined
    //   return n
    // }
  }
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
  curvature(method='Mean') {
    const [k1, k2] = this.principalCurvature()
    switch (method) {
    case 'Mean':
      return (k1+k2)*0.5
    case 'Gaussian':
      return k1*k2
    case 'Kmin':
      return k1
    case 'Kmax':
      return k2
    default: // undefined
      return 0
    }
  }
  principalCurvature() {
    const H = this.meanCurvature()
    const K = this.angleDefect()
    let d = H*H - K
    if (d > 0) {
      d = Math.sqrt(d)
    } else {
      d = 0
    }
    return [H - d, H + d]
  }
  meanCurvature() {
    const clb = this.cotanLaplaceBeltrami()
    if (this.angleDefect() > 0) {
      return clb
    } else {
      return -clb
    }
  }
  cotanLaplaceBeltrami() {
    const a = this.voronoiCell()
    let sum = new Vector()
    this.halfedges(h => {
      sum = sum.add(h.vector().scale(h.cotan() + h.twin.cotan()))
    })
    return sum.norm()*0.5/a
  }
  voronoiCell() {
    let a = 0
    this.halfedges(h => {
      const u = h.prev.vector().norm()
      const v = h.vector().norm()
      a += (u*u*h.prev.cotan() + v*v*h.cotan()) / 8
    })
    return a
  }
  angleDefect() {
    let sum = 0.0
    this.halfedges(h => {
      sum += h.next.angle()
    })
    return (2 * Math.PI - sum)/this.voronoiCell()
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
    this.vertsOrig = [] // an array of original vertex information
    this.vertices  = [] // an array of Vertex object
    this.edges     = [] // an array of Edge object
    this.faces     = [] // an array of Face object
    this.halfedges = [] // an array of Halfedge object
    this.boundaries = []

    // load .obj file
    let indices   = []
    let positions = []
    let lines = data.split('\n')
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
        // only load indices of vertices
        for (let i = 1; i < tokens.length; i++) {
          indices.push(parseInt((tokens[i].split('/')[0]).trim()) - 1)
        }
        continue
      }
    }

    // build the halfedge connectivity
    const edges = new Map()
    for (let i = 0; i < indices.length; i += 3) {
      for (let j = 0; j < 3; j++) { // check a face
        const a = indices[i + j]
        const b = indices[i + (j+1)%3]

        if (a > b) {
          const tmp = b
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

    this.vertsOrig  = new Array(positions.length) // original
    this.vertices   = new Array(positions.length) // for update
    this.edges      = new Array(edges.size)
    this.faces      = new Array(indices.length / 3)
    this.halfedges  = new Array(edges.size*2)

    const idx2vert = new Map()
    for (let i = 0; i < positions.length; i++) {
      const v = new Vertex()
      v.position = positions[i]
      this.vertices[i] = v
      const vorig = new Vertex()
      vorig.position = new Vector(positions[i].x, positions[i].y, positions[i].z)
      this.vertsOrig[i] = vorig
      idx2vert.set(i, v)
    }

    let edgeIndex = 0
    let edgeCount = new Map()
    let existedHalfedges = new Map()
    let hasTwinHalfedge = new Map()

    // construct halfedges, edges
    for (let i = 0; i < indices.length; i += 3) {
      // construct face
      const f = new Face()
      this.faces[i / 3] = f

      // construct halfedges of the face
      for (let j = 0; j < 3; j++) {
        const he = new Halfedge()
        this.halfedges[i+j] = he
      }

      // construct connectivities of the new halfedges
      for (let j = 0; j < 3; j++) {
        // halfedge from vertex a to vertex b
        const a = indices[i + j]
        const b = indices[i + (j+1)%3]

        // halfedge properties
        const he = this.halfedges[i + j]
        he.next = this.halfedges[i + (j+1)%3]
        he.prev = this.halfedges[i + (j+2)%3]
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
          const tmp = b
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
    }

    // create boundary halfedges and "fake" faces for the boundary cycles
    let halfedgeIndex = indices.length
    for (let i = 0; i < indices.length; i++) {
      // if a halfedge has no twin, create a new face and link it
      // the corresponding boundary cycle

      const he = this.halfedges[i]
      if (!hasTwinHalfedge.get(he)) {

        // create face
        const f = new Face()
        this.boundaries.push(f)

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
        } while(current != he)

        // link the cycle of boundary halfedges together
        const n = boundaryCycle.length
        for (let j = 0; j < n; j++) {
          boundaryCycle[j].next = boundaryCycle[(j+n-1)%n]
          boundaryCycle[j].prev = boundaryCycle[(j+1)%n]
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
    this.vertsOrig.forEach(v => {
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
      // HACK: all halfedge now accessible to the original vertices
      he.vertsOrig = this.vertsOrig
      he.idx = index++
    })

  }
  /**
   * flatten computes the UV coordinates of the given triangle mesh.
   *
   * This implementation reuiqres the mesh contains at least one
   * boundary loop.
   *
   * @param {string} boundaryType 'disk', or 'rect'
   * @param {string} laplaceWeight 'uniform', or 'cotan'
   */

  flatten(boundaryType, laplaceWeight) {
    // TODO: implement the Tutte's barycentric embedding algorithm.
    //
    // Hint:
    // 1. check if the mesh contains a boundary
    // 2. compute boundary uv coordinates depending on the boundary type
    // 3. compute matrix depending on the laplacian weight type
    // 4. solve linear equation and assing computed uv as vertex uv
    
    console.log(this.boundaries.length)

		let boundaryVertices = 0
    
    this.boundaries[0].vertices(v => {
      boundaryVertices++
    })
		
    console.log(boundaryVertices)

    let boundaryEdges = []
    let tempHe = this.boundaries[0].halfedge

    //let boundaryLength = 0

    for(let n = 0; n < boundaryVertices; n++) {
      //boundaryLength += tempHe.vector().norm()
      boundaryEdges.push(tempHe)
      tempHe = tempHe.next 
    }

    let uCoo = DenseMatrix.zeros(this.vertices.length)
    let vCoo = DenseMatrix.zeros(this.vertices.length)
    const radius = 0.5

    switch(boundaryType) {
      case 'disk':
        boundaryEdges.forEach((halfedge, i) => {
          uCoo.set((radius*Math.cos(2*Math.PI*i/boundaryEdges.length) + radius), halfedge.vertex.idx)
          vCoo.set((radius*Math.sin(2*Math.PI*i/boundaryEdges.length) + radius), halfedge.vertex.idx)
        })

        break
      case 'rect':
        let uTemp = 1 
        let vTemp = 1
        let binary = 0

        boundaryEdges.forEach(halfedge => {
          let step = 4 / boundaryEdges.length
          let uComponent = 0
          let vComponent = 0

  
          if(uTemp > 0 && uTemp <= 1 + step && vTemp >= 1) {
            if((uTemp - step) > 1){
              binary = 1
            }else if((uTemp - step) < 0){
              binary = 0
            }else{
              binary = (uTemp - step)
            }
            uComponent = binary
            vComponent = 1


          } else if(uTemp <= 0 && vTemp > 0) {
            if((vTemp - step) > 1){
              binary = 1
            }else if((vTemp - step) < 0){
              binary = 0
            }else{
              binary = (vTemp - step)
            }
            uComponent = 0
            vComponent = binary


          } else if(uTemp < 1 && vTemp <= 0) {
            if((uTemp + step) > 1){
              binary = 1
            }else if((uTemp + step) < 0){
              binary = 0
            }else{
              binary = (uTemp + step)
            }
            uComponent = binary
            vComponent = 0


          } else {
            if((vTemp + step) > 1){
              binary = 1
            }else if((vTemp + step) < 0){
              binary = 0
            }else{
              binary = (vTemp + step)
            }
            uComponent = 1
            vComponent = binary
          }
          uCoo.set(uComponent, halfedge.vertex.idx)
          vCoo.set(vComponent, halfedge.vertex.idx)
          uTemp = uComponent
          vTemp = vComponent
        })
        break
  }
        
  //compute laplacian matrix 
  const n = this.vertices.length 
  let T = new Triplet(n, n)
  for(const vert of this.vertices) {
    const i = vert.idx
    if(uCoo.get(i) != 0 || vCoo.get(i) != 0) {
      T.addEntry(1, i, i)
    } else {
    let sum = 1e-8
    vert.halfedges(h => {
      let w = 0
      switch(laplaceWeight) {
        case 'uniform':
          w = 1
          break
        case 'cotan':
          w = (h.cotan() + h.twin.cotan())/2
          break
      }
      sum += w
      T.addEntry(-w, i, h.twin.vertex.idx)
    })
    T.addEntry(sum, i, i)
  }
  }

  let A = SparseMatrix.fromTriplet(T)

  let lu = A.lu()
  let u = lu.solveSquare(uCoo)
  let v = lu.solveSquare(vCoo)

  for(let vert of this.vertices) {
    vert.uv = new Vector(u.get(vert.idx), v.get(vert.idx), 0)
  }

  }
}
