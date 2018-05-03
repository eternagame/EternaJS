/*   

cost.h   ::  global variables for Edit Costs
             included by treedist.c and stringdist.c

*/
#define PRIVATE static

PRIVATE char   sep    = ':';
PRIVATE char  *coding = "Null:U:P:H:B:I:M:S:E:R";

#define  INF 10000  /* infinity */  

typedef int CostMatrix[10][10];

PRIVATE CostMatrix *EditCost;  /* will point to UsualCost or ShapiroCost */

PRIVATE CostMatrix  UsualCost = 
{

/*  Null,U,  P,   H,   B,   I,   M,   S,   E,   R     */

   {0,   1,   2,   2,   2,   2,   2,   1,  1,  INF},   /* Null */
   {1,   0,   1, INF, INF, INF, INF, INF, INF, INF},   /* U    */
   {2,   1,   0, INF, INF, INF, INF, INF, INF, INF},   /* P    */
   {2, INF, INF,   0,   2,   2,   2, INF, INF, INF},   /* H    */
   {2, INF, INF,   2,   0,   1,   2, INF, INF, INF},   /* B    */
   {2, INF, INF,   2,   1,   0,   2, INF, INF, INF},   /* I    */
   {2, INF, INF,   2,   2,   2,   0, INF, INF, INF},   /* M    */
   {1, INF, INF, INF, INF, INF, INF,   0, INF, INF},   /* S    */
   {1, INF, INF, INF, INF, INF, INF, INF,   0, INF},   /* E    */
   {INF, INF, INF, INF, INF, INF, INF, INF, INF,   0}, /* R    */

};


PRIVATE CostMatrix ShapiroCost = 
{

/*  Null,   U,   P,   H,   B,   I,   M,   S,   E,  R     */

   {   0,   1,   2, 100,   5,   5,  75,   5,   5, INF},   /* Null*/
   {   1,   0,   1, INF, INF, INF, INF, INF, INF, INF},   /* U   */
   {   2,   1,   0, INF, INF, INF, INF, INF, INF, INF},   /* P   */
   { 100, INF, INF,   0,   8,   8,   8, INF, INF, INF},   /* H   */
   {   5, INF, INF,   8,   0,   3,   8, INF, INF, INF},   /* B   */
   {   5, INF, INF,   8,   3,   0,   8, INF, INF, INF},   /* I   */
   {  75, INF, INF,   8,   8,   8,   0, INF, INF, INF},   /* M   */
   {   5, INF, INF, INF, INF, INF, INF,   0, INF, INF},   /* S   */
   {   5, INF, INF, INF, INF, INF, INF, INF,   0, INF},   /* E   */
   { INF, INF, INF, INF, INF, INF, INF, INF, INF,   0},   /* R   */

};

