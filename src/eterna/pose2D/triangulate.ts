import libtess from 'libtess';

// libtess. Also tried PolyK, poly2tri, and earcut, and they failed for scoreNode -- rhiju.
// see https://brendankenny.github.io/libtess.js/examples/simple_triangulation/triangulate.js

    // function called for each vertex of tesselator output
    function vertexCallback(data: number[], polyVertArray: number[]) {
        polyVertArray[polyVertArray.length] = data[0];
        polyVertArray[polyVertArray.length] = data[1];
    }
    // function begincallback(type) {
    //     if (type !== libtess.primitiveType.GL_TRIANGLES) {
    //         // console.log(`expected TRIANGLES but got type: ${type}`);
    //     }
    // }
    // function errorcallback(errno) {
    //     // console.log('error callback');
    //     // console.log(`error number: ${errno}`);
    // }
    // callback for when segments intersect and must be split
    function combinecallback(coords: number[], data: number[], weight: number) {
        // console.log('combine callback');
        return [coords[0], coords[1], coords[2]];
    }
    // function edgeCallback(flag) {
    //     // don't really care about the flag, but need no-strip/no-fan behavior
    //     // console.log('edge flag: ' + flag);
    // }

    const tessy = new libtess.GluTesselator();
    // tessy.gluTessProperty(libtess.gluEnum.GLU_TESS_WINDING_RULE, libtess.windingRule.GLU_TESS_WINDING_POSITIVE);
    tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX_DATA, vertexCallback);
    // tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_BEGIN, begincallback);
    // tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, errorcallback);
    tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE, combinecallback);
    // tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_EDGE_FLAG, edgeCallback);



export default function triangulate(contour: number[]): number[] {
    // see https://brendankenny.github.io/libtess.js/examples/simple_triangulation/triangulate.js
    // libtess will take 3d verts and flatten to a plane for tesselation
    // since only doing 2d tesselation here, provide z=1 normal to skip
    // iterating over verts only to get the same answer.
    // comment out to test normal-generation code
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
