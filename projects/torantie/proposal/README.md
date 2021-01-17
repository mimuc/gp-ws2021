# Proposal: [Quadrilateral Mesh Smoothing with mean value weights]

[torantie]

[17.01.2021]

## Abstract

The aim of this object is to give the existing halfedge structure from our exercises quadrilateral support and implement the Laplacian smooth with mean value weights.

## Motivation

Our lecture already introduced the halfedge structure to us. This was inteded as storage for a triangular mesh. Since the structure can also be used for quadrilateral meshes it could be interseting to extend the current implementation. Additionally, i want to focus on smoothing the different mesh structure. In the lectures and through  our exercises we were introduced to Laplacian smoothing with uniform and cotan weight. I want to implement this smoothing and add the option of mean value weights, since i find the resulting mesh interesting.


## Proposal

I want to implement quadrilateral support for the existing halfedge structure we were using in our exercises and implement Laplacian smoothing with mean value weights.
The project is mostly related to the content provided in lecture 1, 3 and 4. Specifically for the mean value weights of the Laplacian smooth, the paper of Floater describing mean value coordinates is relevant.
This is relevant to geometry processing since it extends a data structure used for storing geometry and shows a different represantion of a geometry object. Furthermore, it concerns itself with mesh smoothing which is releavnt to decrease noise in the mesh.
Half edge structures can be implemented in a multitude of ways (see Lutz Kettner and Kalle Rutanen) and the smoothing will be based on the paper from Floater and the lecture slides, therefore this project will not be based on an existing solution.

## Implementation

The programming language will be JavaScript and three.js. These will be the milestones.
1. building/adjusting the halfedge connectivity
2. adjust handling of boundary edges
3. edit normal calculation based on mesh type (triangular or quadrilateral)
4. Implement a wireframe representation for the quad mesh
5. adapt smoothing calculations based on mesh type (triangular or quadrilateral) for cotan, uniform and mean value weights

The 4th milestone could be a challenge since three.js doesn't have quad support (see K41) but subdivides the mesh into triangles. Since this is an exclusively cosmetic problem and doesn't concern the halfedge structures quad support, this might not be a priority to implement.

## References

- Floater MS. Mean value coordinates. Computer aided geometric design. March, 2003 http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.95.6026&rep=rep1&type=pdf
- Lutz Kettner, Chapter 29 Halfedge Data Structures. December 21, 2004  https://www.ics.uci.edu/~dock/manuals/cgal_manual/HalfedgeDS/Chapter_main.html
- Kalle Rutanen, Half-edge structure. December 16, 2014 https://kaba.hilvi.org/homepage/blog/halfedge/halfedge.htm
- K41, Rendering quad mesh and it’s edges. May, 2017 https://discourse.threejs.org/t/rendering-quad-mesh-and-its-edges/424