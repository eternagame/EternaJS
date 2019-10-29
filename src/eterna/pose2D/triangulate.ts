import libtess from 'libtess';

/**
 * libtess. Also tried PolyK, poly2tri, and earcut, and they failed for scoreNode -- rhiju.
 * see https://brendankenny.github.io/libtess.js/examples/simple_triangulation/triangulate.js
*/

function vertexCallback(data: number[], polyVertArray: number[]): void {
    // function called for each vertex of tesselator output
    polyVertArray[polyVertArray.length] = data[0];
    polyVertArray[polyVertArray.length] = data[1];
}

function combinecallback(coords: number[], data: number[], weight: number): number[] {
    // callback for when segments intersect and must be split
    return [coords[0], coords[1], coords[2]];
}

const tessy = new libtess.GluTesselator();
tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX_DATA, vertexCallback);
tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE, combinecallback);

/**
 *  see https://brendankenny.github.io/libtess.js/examples/simple_triangulation/triangulate.js
 *  libtess will take 3d verts and flatten to a plane for tesselation
 *  since only doing 2d tesselation here, provide z=1 normal to skip
 *  iterating over verts only to get the same answer.
 *  comment out to test normal-generation code
 * @param contour
 */
export default function triangulate(contour: number[]): number[] {
    tessy.gluTessNormal(0, 0, 1);
    let triangleVerts: number[] = [];
    tessy.gluTessBeginPolygon(triangleVerts);
    tessy.gluTessBeginContour();
    for (let ii = 0; ii < contour.length; ii += 2) {
        let coords = [contour[ii], contour[ii + 1], 0];
        tessy.gluTessVertex(coords, coords);
    }
    tessy.gluTessEndContour();
    tessy.gluTessEndPolygon();
    return triangleVerts;
}
